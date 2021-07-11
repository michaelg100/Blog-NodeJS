var sqlite3 = require('sqlite3').verbose();
var express = require('express');
var http = require('http');
var path = require("path");
var bodyParser = require('body-parser');
var helmet = require('helmet');
var rateLimit = require("express-rate-limit");
var session = require('express-session');


var app = express();
var server = http.createServer(app);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});


var db = new sqlite3.Database('./database/new.db');


app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname,'./public')));
app.use(helmet());
app.use(limiter);

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));


//db.run('CREATE TABLE IF NOT EXISTS contacts (email TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE)');

//db.run('CREATE TABLE IF NOT EXISTS posts (postid int PRIMARY KEY, post TEXT NOT NULL, FOREIGN KEY (email) REFERENCES contacts (email))');

 var dbSchema = `
 
    CREATE TABLE IF NOT EXISTS Users (
        email text PRIMARY KEY,
        password text NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Blogs (
        title text NOT NULL,
        blog text,
        email text NOT NULL,
            FOREIGN KEY (email) 
              REFERENCES Users(email)
    );
    
    
    `

    db.exec(dbSchema, function(err){
        if (err) {
            console.log(err)
        }
    });


app.get('/', function(req,res){
  res.sendFile(path.join(__dirname,'./public/form.html'));
});




// Add users
app.post('/adduser', function(req,res){
  db.serialize(()=>{
    db.run('INSERT INTO Users(email,password) VALUES(?,?)', [req.body.email, req.body.password], function(err) {
      if (err) {
        res.send('Username already in use');
        console.log(err.message);
      }else {
		    console.log("New user has been added");
        res.send("Email = "+req.body.email+ " and Password = "+req.body.password);
	    }
      
    });

  });

});


// View
app.post('/login', function(req,res){
  var username = req.body.email;
	var password = req.body.password;
  db.serialize(()=>{
    db.each('SELECT * FROM Users WHERE email =? AND password =?', [req.body.email, req.body.password], function(err,row){     //db.each() is only one which is funtioning while reading data from the DB
      if(err){
        res.send("Error encountered while displaying");
        return console.error(err.message);
      }
      console.log();
      if (row.email && row.password) {
				req.session.loggedin = true;
				req.session.username = username;
				res.redirect('/welcome');
        console.log("Entry displayed successfully");
			} else {
				res.send('Incorrect Username and/or Password!');
			}			
			res.end();
      
      //res.send(` ID: ${row.email},    Name: ${row.password}`);

      
    });
  });
});



// Add
app.post('/addpost', function(req,res){
  db.serialize(()=>{
    db.run('INSERT INTO Blogs(title,blog,email) VALUES(?,?,?)', [req.body.title, req.body.post, req.session.username], function(err) {
      if (err) {
        return console.log(err.message);
      }
      //console.log("New employee has been added");
      //res.send("New employee has been added into the database with ID = "+req.body.title+ " and Name = "+ req.session.username);
      res.sendFile(path.join(__dirname,'./public/welcome.html'));
    });

  });

});


// View
app.post('/viewpost', function(req,res){
  db.serialize(()=>{
    db.all("SELECT * FROM Blogs WHERE email = ?",[req.session.username], function(err, allRows) {

            if(err != null){
                console.log(err);
            }
            
            var text = '<!DOCTYPE html><html><head><style>table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}td, th {border: 1px solid #dddddd;text-align: left;padding: 8px;}tr:nth-child(even) {background-color: #dddddd;}</style></head><body><h2>Your Posts</h2><table><tr><th>Title</th><th>Blog</th><th>Email</th></tr>';
            var arr = allRows
          for (var i = 0; i < arr.length; i++){
              //text+="<br><br>array index: " + i;
            text+="<tr>";
              var obj = arr[i];
              for (var key in obj){
                var value = obj[key];
                
                //text+=("<br> - " + key + ": " + value);
                text+=("<td>" + value + "</td>" );
              }
            text+='</tr>';
            }
            text += '</table></body>'
            res.send(text);

        });
  });
});






// Closing the database connection.
app.get('/close', function(req,res){
  db.close((err) => {
    if (err) {
      res.send('There is some error in closing the database');
      return console.error(err.message);
    }
    console.log('Closing the database connection.');
    res.send('Database connection successfully closed');
  });

});



//routes

app.get('/welcome',function(req,res){
  
  if (req.session.loggedin) {
		res.sendFile(path.join(__dirname,'./public/welcome.html'));
    console.log('logged in');
	} else {
		res.send('Please login to view this page!');
	}
	
  
});


// example build page from params
//app.get('/tests/:id/:title', function(req, res) {
//   res.send('id: ' + req.params.id + ' and title: ' + req.params.title);
//});



// View
app.get('/posts/:id', function(req,res){
  db.serialize(()=>{
    db.all("SELECT rowid, * FROM Blogs WHERE rowid =?",[req.params.id], function(err, allRows) {

            if(err != null){
                console.log(err);
            }
            console.log(allRows)
      
            var blog_txt = "<!DOCTYPE html><html><head></head><body><p>"+ allRows[0].title  +"</p><p>" + allRows[0].blog+"</p></body></html>";
            res.send(blog_txt);

        });
  });
});


server.listen(4000, function(){
  console.log("server is listening on port: 4000");
});

