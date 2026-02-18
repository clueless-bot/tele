import fs from "fs/promises";

// remove uploaded file
export function unlinkFile(filepath) {
    return fs.unlink(filepath)
}