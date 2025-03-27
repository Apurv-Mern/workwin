What is this repository for?
Quick summary
Version
setup project and deply to the server
install nodejs 20.12 on your system
clone or download as a zip the project from repo
go to the project directory and run command
npm install
install mongodb on your local mechine and download json file of database import to your mongo db
change the databse connection string from config/defaut.json if enviroment is DEV then change use dblocal key otherwise use db key
run the command npm start
it will run the project on basepath(Host):3010 port
the routes serve on the localhost:3010/api/v1/user/route name