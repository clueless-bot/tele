


build image: docker build -t teleplay-backend ./

run container: docker run -it -p 9898:9898 --name teleplay-backend teleplay-backend


// "dev": "yarn && docker build -t teleplay-backend . && docker run -it -p 9898:9898 --name teleplay-backend teleplay-backend",