package com.semilshah.teleplay

import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.github.se_bastiaan.torrentstream.StreamStatus
import com.github.se_bastiaan.torrentstream.Torrent
import com.github.se_bastiaan.torrentstream.TorrentOptions
import com.github.se_bastiaan.torrentstream.TorrentStream
import com.github.se_bastiaan.torrentstream.listeners.TorrentListener
import fi.iki.elonen.NanoHTTPD
import org.libtorrent4j.AnnounceEntry
import org.libtorrent4j.Priority
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.net.URLConnection

class TeleplayTorrentModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), TorrentListener {
  private var torrentStream: TorrentStream? = null
  private var httpServer: TorrentHttpServer? = null
  private var listenerCount = 0

  override fun getName() = "TeleplayTorrent"

  @ReactMethod
  fun start(magnetUrl: String, promise: Promise) {
    if (!magnetUrl.startsWith("magnet:?", ignoreCase = true)) {
      promise.reject("INVALID_MAGNET", "A valid magnet link is required.")
      return
    }

    try {
      val stream = getOrCreateStream()
      stopHttpServer()
      // TorrentStream.init() begins asynchronous libtorrent setup. Calling
      // stopStream on a newly-created instance removes that setup work, leaving
      // fetchMagnet waiting forever at “Finding torrent metadata”. Only stop an
      // actually active previous stream.
      if (stream.isStreaming) stream.stopStream()
      // Metadata peers are discovered before onStreamPrepared is called. Put
      // trackers in the magnet now, rather than waiting until after metadata
      // has already been fetched.
      stream.startStream(withFastTrackers(magnetUrl))
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("TORRENT_START_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    try {
      stopHttpServer()
      torrentStream?.stopStream()
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("TORRENT_STOP_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun addListener(eventName: String) {
    listenerCount += 1
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    listenerCount = (listenerCount - count).coerceAtLeast(0)
  }

  private fun getOrCreateStream(): TorrentStream {
    torrentStream?.let { return it }

    val cacheRoot = reactContext.externalCacheDir ?: reactContext.cacheDir
    val cacheDirectory = File(cacheRoot, "torrent-streams").apply { mkdirs() }
    pruneStaleCache(cacheDirectory)
    val options = TorrentOptions.Builder()
      .saveLocation(cacheDirectory)
      .maxDownloadSpeed(0)
      .maxUploadSpeed(0)
      // A torrent needs several peers to find the fastest pieces. These limits
      // are high enough for fast discovery without spawning an unbounded number
      // of mobile connections.
      .maxConnections(320)
      .maxActiveDHT(200)
      .prepareSize(INITIAL_BUFFER_BYTES)
      .removeFilesAfterStop(true)
      .autoDownload(false)
      .build()

    return TorrentStream.init(options).also {
      it.addListener(this)
      torrentStream = it
    }
  }

  private fun emit(eventName: String, values: Map<String, Any?> = emptyMap()) {
    if (listenerCount == 0 || !reactContext.hasActiveReactInstance()) return

    val payload = Arguments.createMap()
    values.forEach { (key, value) ->
      when (value) {
        is String -> payload.putString(key, value)
        is Number -> payload.putDouble(key, value.toDouble())
        is Boolean -> payload.putBoolean(key, value)
        null -> payload.putNull(key)
      }
    }
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, payload)
  }

  override fun onStreamPrepared(torrent: Torrent) {
    selectLargestMediaFile(torrent)
    announceToMorePeers(torrent)
    // Start requesting the opening pieces before the player makes its first
    // HTTP range request. This shortens time-to-first-frame after metadata is
    // available.
    torrent.setInterestedBytes(0L)
    torrent.startDownload()
    emit("TeleplayTorrentPrepared", mapOf("fileName" to torrent.videoFile.name))
  }

  override fun onStreamStarted(torrent: Torrent) {
    emit("TeleplayTorrentStarted")
  }

  override fun onStreamReady(torrent: Torrent) {
    try {
      stopHttpServer()
      val server = TorrentHttpServer(torrent).also {
        it.start(NanoHTTPD.SOCKET_READ_TIMEOUT, true)
        httpServer = it
      }
      val fileName = Uri.encode(torrent.videoFile.name)
      emit(
        "TeleplayTorrentReady",
        mapOf("uri" to "http://127.0.0.1:${server.listeningPort}/media/$fileName")
      )
    } catch (error: Exception) {
      emit("TeleplayTorrentError", mapOf("message" to (error.message ?: "Local stream failed.")))
    }
  }

  override fun onStreamProgress(torrent: Torrent, status: StreamStatus) {
    emit(
      "TeleplayTorrentProgress",
      mapOf(
        "progress" to status.bufferProgress,
        "downloadSpeed" to status.downloadSpeed,
        "seeds" to status.seeds
      )
    )
  }

  override fun onStreamError(torrent: Torrent?, error: Exception) {
    emit("TeleplayTorrentError", mapOf("message" to (error.message ?: "Torrent stream failed.")))
  }

  override fun onStreamStopped() {
    stopHttpServer()
    emit("TeleplayTorrentStopped")
  }

  override fun invalidate() {
    stopHttpServer()
    torrentStream?.removeListener(this)
    torrentStream?.stopStream()
    torrentStream = null
    super.invalidate()
  }

  private fun stopHttpServer() {
    httpServer?.stop()
    httpServer = null
  }

  private fun selectLargestMediaFile(torrent: Torrent) {
    val files = torrent.torrentHandle.torrentFile().files()
    var selectedIndex = -1
    var selectedSize = -1L

    for (index in 0 until files.numFiles()) {
      val extension = files.filePath(index).substringAfterLast('.', "").lowercase()
      val size = files.fileSize(index)
      if (extension in MEDIA_EXTENSIONS && size > selectedSize) {
        selectedIndex = index
        selectedSize = size
      }
    }

    if (selectedIndex >= 0) torrent.setSelectedFileIndex(selectedIndex)
    else torrent.setLargestFile()
  }

  private fun announceToMorePeers(torrent: Torrent) {
    val handle = torrent.torrentHandle
    for (tracker in FAST_PUBLIC_TRACKERS) {
      try {
        handle.addTracker(AnnounceEntry(tracker))
      } catch (_: Exception) {
        // A bad tracker must never prevent normal DHT/PEX discovery.
      }
    }
    try {
      handle.forceDHTAnnounce()
      handle.forceReannounce()
    } catch (_: Exception) {
      // Discovery continues through the library's built-in tracker handling.
    }
  }

  private fun withFastTrackers(magnetUrl: String): String {
    val separator = if (magnetUrl.contains('?')) "&" else "?"
    val trackerParams = FAST_PUBLIC_TRACKERS.joinToString("&") { tracker ->
      "tr=${Uri.encode(tracker)}"
    }
    return "$magnetUrl$separator$trackerParams"
  }

  private inner class TorrentHttpServer(
    private val torrent: Torrent
  ) : NanoHTTPD("127.0.0.1", 0) {
    override fun serve(session: IHTTPSession): Response {
      if (!session.uri.startsWith("/media/")) {
        return newFixedLengthResponse(Response.Status.NOT_FOUND, MIME_PLAINTEXT, "Not found")
      }

      return try {
        createMediaResponse(session.method, session.headers["range"])
      } catch (error: Exception) {
        newFixedLengthResponse(
          Response.Status.INTERNAL_ERROR,
          MIME_PLAINTEXT,
          error.message ?: "Unable to read torrent stream"
        )
      }
    }

    private fun createMediaResponse(method: Method, rangeHeader: String?): Response {
      val mediaFile = torrent.videoFile
      val totalLength = mediaFile.length()
      if (totalLength <= 0L) {
        return newFixedLengthResponse(
          Response.Status.SERVICE_UNAVAILABLE,
          MIME_PLAINTEXT,
          "Torrent metadata is not ready"
        )
      }

      val mimeType = mimeTypeFor(mediaFile.name)
      if (method == Method.HEAD) {
        return newFixedLengthResponse(
          Response.Status.OK,
          mimeType,
          ByteArrayInputStream(ByteArray(0)),
          0
        ).apply {
          addStreamingHeaders(totalLength)
        }
      }

      val requestedRange = parseRange(rangeHeader, totalLength)
      if (!rangeHeader.isNullOrBlank() && requestedRange == null) {
        return newFixedLengthResponse(
          Response.Status.RANGE_NOT_SATISFIABLE,
          MIME_PLAINTEXT,
          "Requested range is outside the media file"
        ).apply {
          addHeader("Content-Range", "bytes */$totalLength")
          addHeader("Accept-Ranges", "bytes")
        }
      }

      val start = requestedRange?.first ?: 0L
      val requestedEnd = requestedRange?.last ?: totalLength - 1
      val end = if (requestedRange == null) {
        requestedEnd
      } else {
        minOf(requestedEnd, start + MAX_HTTP_CHUNK_BYTES - 1)
      }
      val responseLength = end - start + 1

      val pieceLayout = prioritizePlaybackWindow(torrent, start)
        ?: throw IllegalStateException("Selected torrent file was not found")
      torrent.setInterestedBytes(start)
      val fileStream = FileInputStream(mediaFile)
      skipFully(fileStream, start)
      val selectedFileBaseOffset = pieceLayout.absoluteOffset - start
      var nextPriorityRefresh = start + PRIORITY_REFRESH_BYTES
      val stream = VerifiedPieceInputStream(
        fileStream,
        torrent,
        pieceLayout.absoluteOffset,
        pieceLayout.pieceLength,
      ) { absolutePosition ->
        // FFmpeg reads the local stream sequentially. Continue advancing the
        // libtorrent priority window as it moves through the file; otherwise
        // only the opening pieces would download and conversion would stall.
        val filePosition = absolutePosition - selectedFileBaseOffset
        if (filePosition >= nextPriorityRefresh) {
          prioritizePlaybackWindow(torrent, filePosition)
          torrent.setInterestedBytes(filePosition)
          nextPriorityRefresh = filePosition + PRIORITY_REFRESH_BYTES
        }
      }

      val status = if (requestedRange == null) Response.Status.OK else Response.Status.PARTIAL_CONTENT
      return newFixedLengthResponse(status, mimeType, stream, responseLength).apply {
        addStreamingHeaders(responseLength)
        if (requestedRange != null) {
          addHeader("Content-Range", "bytes $start-$end/$totalLength")
        }
      }
    }

    private fun prioritizePlaybackWindow(torrent: Torrent, fileOffset: Long): PieceLayout? {
      val handle = torrent.torrentHandle
      val info = handle.torrentFile()
      val files = info.files()
      val selectedPath = torrent.videoFile.canonicalPath
      var selectedIndex = -1
      for (index in 0 until files.numFiles()) {
        val candidate = File(handle.savePath(), files.filePath(index)).canonicalPath
        if (candidate == selectedPath) {
          selectedIndex = index
          break
        }
      }
      if (selectedIndex < 0) return null

      val pieceLength = info.pieceLength().coerceAtLeast(1)
      val absoluteOffset = files.fileOffset(selectedIndex) + fileOffset
      val firstPiece = (absoluteOffset / pieceLength).toInt()
      val firstFilePiece = files.pieceIndexAtFile(selectedIndex)
      val lastFilePiece = files.lastPieceIndexAtFile(selectedIndex)
      val windowPieces = (PLAYBACK_PRIORITY_WINDOW_BYTES / pieceLength).toInt().coerceAtLeast(6)
      val lastPiece = minOf(lastFilePiece, firstPiece + windowPieces)

      handle.clearPieceDeadlines()
      val priorities = handle.piecePriorities()
      for (piece in firstFilePiece..lastFilePiece) {
        priorities[piece] = if (piece in firstPiece..lastPiece) {
          Priority.TOP_PRIORITY
        } else {
          Priority.IGNORE
        }
      }
      handle.prioritizePieces(priorities)
      for (piece in firstPiece..lastPiece) {
        handle.setPieceDeadline(piece, (piece - firstPiece) * PIECE_DEADLINE_STEP_MS)
      }
      return PieceLayout(absoluteOffset, pieceLength)
    }

    private fun Response.addStreamingHeaders(contentLength: Long) {
      addHeader("Accept-Ranges", "bytes")
      addHeader("Content-Length", contentLength.toString())
      addHeader("Cache-Control", "no-store")
      addHeader("Connection", "keep-alive")
    }

    private fun parseRange(header: String?, totalLength: Long): LongRange? {
      if (header.isNullOrBlank() || !header.startsWith("bytes=")) return null
      val value = header.removePrefix("bytes=").substringBefore(',').trim()
      val parts = value.split('-', limit = 2)
      if (parts.size != 2) return null

      val start: Long
      val end: Long
      if (parts[0].isBlank()) {
        val suffixLength = parts[1].toLongOrNull()?.coerceAtLeast(0L) ?: return null
        start = (totalLength - suffixLength).coerceAtLeast(0L)
        end = totalLength - 1
      } else {
        start = parts[0].toLongOrNull()?.coerceAtLeast(0L) ?: return null
        end = (parts[1].toLongOrNull() ?: totalLength - 1).coerceAtMost(totalLength - 1)
      }

      if (start >= totalLength || end < start) return null
      return start..end
    }

    private fun skipFully(stream: InputStream, byteCount: Long) {
      var remaining = byteCount
      while (remaining > 0) {
        val skipped = stream.skip(remaining)
        if (skipped > 0) {
          remaining -= skipped
        } else if (stream.read() == -1) {
          break
        } else {
          remaining -= 1
        }
      }
    }

    private fun mimeTypeFor(fileName: String): String {
      val extension = fileName.substringAfterLast('.', "").lowercase()
      return MEDIA_MIME_TYPES[extension]
        ?: URLConnection.guessContentTypeFromName(fileName)
        ?: "application/octet-stream"
    }
  }

  private data class PieceLayout(val absoluteOffset: Long, val pieceLength: Int)

  /** Reads only hash-verified libtorrent pieces and never crosses a piece boundary. */
  private class VerifiedPieceInputStream(
    private val source: InputStream,
    private val torrent: Torrent,
    absoluteOffset: Long,
    private val pieceLength: Int,
    private val onPositionAdvanced: (Long) -> Unit
  ) : InputStream() {
    @Volatile private var closed = false
    private var position = absoluteOffset

    private fun waitForCurrentPiece(): Boolean {
      val handle = torrent.torrentHandle
      val piece = (position / pieceLength).toInt()
      while (!closed && handle.isValid && !handle.havePiece(piece)) {
        try {
          Thread.sleep(PIECE_WAIT_POLL_MS)
        } catch (_: InterruptedException) {
          Thread.currentThread().interrupt()
          return false
        }
      }
      return !closed && handle.isValid && handle.havePiece(piece)
    }

    override fun read(): Int {
      if (!waitForCurrentPiece()) return -1
      val value = source.read()
      if (value >= 0) {
        position += 1
        onPositionAdvanced(position)
      }
      return value
    }

    override fun read(buffer: ByteArray, offset: Int, length: Int): Int {
      if (length == 0) return 0
      if (pieceLength <= 0) return source.read(buffer, offset, length)
      if (!waitForCurrentPiece()) return -1

      val bytesUntilBoundary = pieceLength - (position % pieceLength).toInt()
      val bytesRead = source.read(buffer, offset, minOf(length, bytesUntilBoundary))
      if (bytesRead > 0) {
        position += bytesRead
        onPositionAdvanced(position)
      }
      return bytesRead
    }

    override fun available() = source.available()

    override fun close() {
      closed = true
      source.close()
    }
  }

  companion object {
    // TorrentStream prepares this amount at both ends of the media file. A
    // sub-megabyte startup window is enough for the local range server to open
    // quickly, while subsequent piece priorities keep playback buffered.
    private const val INITIAL_BUFFER_BYTES = 768L * 1024L
    private const val MAX_HTTP_CHUNK_BYTES = 8L * 1024L * 1024L
    private const val PLAYBACK_PRIORITY_WINDOW_BYTES = 32L * 1024L * 1024L
    private const val PRIORITY_REFRESH_BYTES = 8L * 1024L * 1024L
    private const val PIECE_DEADLINE_STEP_MS = 250
    private const val PIECE_WAIT_POLL_MS = 100L
    private const val STALE_CACHE_BUDGET_BYTES = 2L * 1024L * 1024L * 1024L
    private val FAST_PUBLIC_TRACKERS = listOf(
      "udp://tracker.opentrackr.org:1337/announce",
      "udp://open.stealth.si:80/announce",
      "udp://tracker.torrent.eu.org:451/announce",
      "udp://exodus.desync.com:6969/announce",
      "udp://tracker.cyberia.is:6969/announce",
      "https://tracker.opentrackr.org:443/announce"
    )
    private val MEDIA_MIME_TYPES = mapOf(
      "mp4" to "video/mp4",
      "m4v" to "video/mp4",
      "mkv" to "video/x-matroska",
      "webm" to "video/webm",
      "avi" to "video/x-msvideo",
      "mov" to "video/quicktime",
      "ts" to "video/mp2t",
      "mts" to "video/mp2t",
      "m2ts" to "video/mp2t",
      "mpg" to "video/mpeg",
      "mpeg" to "video/mpeg",
      "vob" to "video/mpeg",
      "flv" to "video/x-flv",
      "wmv" to "video/x-ms-wmv",
      "asf" to "video/x-ms-asf",
      "3gp" to "video/3gpp",
      "3g2" to "video/3gpp2",
      "ogv" to "video/ogg",
      "mp3" to "audio/mpeg",
      "mp2" to "audio/mpeg",
      "m4a" to "audio/mp4",
      "aac" to "audio/aac",
      "ogg" to "audio/ogg",
      "oga" to "audio/ogg",
      "opus" to "audio/opus",
      "wav" to "audio/wav",
      "flac" to "audio/flac",
      "amr" to "audio/amr",
      "aif" to "audio/aiff",
      "aiff" to "audio/aiff",
      "alac" to "audio/mp4",
      "ape" to "audio/x-ape",
      "wma" to "audio/x-ms-wma"
    )
    private val MEDIA_EXTENSIONS = MEDIA_MIME_TYPES.keys

    private fun pruneStaleCache(root: File) {
      val entries = root.listFiles()?.sortedBy { it.lastModified() } ?: return
      var total = entries.sumOf { cacheEntrySize(it) }
      for (entry in entries) {
        if (total <= STALE_CACHE_BUDGET_BYTES) break
        val size = cacheEntrySize(entry)
        if (entry.deleteRecursively()) total -= size
      }
    }

    private fun cacheEntrySize(file: File): Long {
      if (file.isFile) return file.length()
      return file.listFiles()?.sumOf { cacheEntrySize(it) } ?: 0L
    }
  }
}
