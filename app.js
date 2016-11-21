var express = require('express');
var http = require("http")
var request = require('request');
var rp=require('request-promise');
var Clarifai = require('clarifai');
Clarifai.initialize({'clientId':'NYtWYvzRYwh9gnXni64n60y6z9n5cH34PEdnm3uS', 'clientSecret':'yiHV8xG4MoL-d251yYv_C7caeGYrU_-NAFYLQrp9'});
var passport = require('passport');
var Strategy = require('passport-facebook').Strategy;
var async=require('async');
var InstagramStrategy = require('passport-instagram').Strategy;
var INSTAGRAM_CLIENT_ID ="82fc03a1f11f4a33bfd720b10f966582";
var INSTAGRAM_CLIENT_SECRET ="c2b1c9ee461f446bad5199a82464802e";
var probs = [];
var classes = [];
var tags = [];
var counter=0;
removeArr = ['People', 'Television', 'Entrance', 'Logo', 'Details', 'Summer', 'Stairs', 'Winter', 'Restaurant', 'Wedding', 'Daytime', 'Food & Beverages', 'Reception', 'Terrace', 'Wardrobe', 'Bed', 'Kids Area', 'Breakfast Buffet', 'Couch', 'Living Room', 'Building', 'Nighttime', 'Fireplace', 'Gift Shop', 'Coffee Machine', 'Ballroom', 'Internet Area', 'Telephone', 'Bathroom Amenities', 'Lamp'];
map = {'Garden':['Garden','Park'],'Snow & Ski Sports':['Snow','Ski'], 'Bar':['Bars'], 'Animals':['Zoo'], 'Building':['Monument'], 'Surroundings':['Overlook'], 'Spring':['Garden','Park'], 'Autumn':['Garden','Park'], 'View':['Overlook']};

function handleResponse(response){
    
    classes = response.results[0].result.tag.classes;
    probs = response.results[0].result.tag.probs;
    probs.forEach(getTags);
    console.log(tags);
    counter=counter+1;
};

function handleError(err){
  console.log(err);
};

function getTags(item, index)
{ 
    if(item > 0.6 && removeArr.indexOf(classes[index]) < 0 && tags.indexOf(classes[index]) < 0) 
    {
        if(classes[index] in map)
        {    
            for (i = 0; i < map[classes[index]].length; i++)
                if(tags.indexOf(map[classes[index]][i]) < 0)
                    tags.push(map[classes[index]][i]);
        }
        else
            tags.push(classes[index]);
        
    }
    
}
//var InstagramStrategy = require('passport-instagram').Strategy;
// Configure the Facebook strategy for use by Passport.
//
// OAuth 2.0-based strategies require a `verify` function which receives the
// credential (`accessToken`) for accessing the Facebook API on the user's
// behalf, along with the user's profile.  The function must invoke `cb`
// with a user object, which will be set at `req.user` in route handlers after
// authentication.
passport.use(new Strategy({
    clientID: "1190452254320209",
    clientSecret: "8115ce3033f3072f3be4cd7ea38fbaf4",
    callbackURL: 'http://localhost:3000/login/facebook/return'
  },
  function(accessToken, refreshToken, profile, cb) {
    tkn=accessToken;
    return cb(null, profile);
  }));

passport.use(new InstagramStrategy({
    clientID: INSTAGRAM_CLIENT_ID,
    clientSecret: INSTAGRAM_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/instagram/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    tkn=accessToken;
      // To keep the example simple, the user's Instagram profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Instagram account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
   
  }
));
// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  In a
// production-quality application, this would typically be as simple as
// supplying the user ID when serializing, and querying the user record by ID
// from the database when deserializing.  However, due to the fact that this
// example does not have a database, the complete Twitter profile is serialized
// and deserialized.
passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});
// Create a new Express application.
var app = express();

// Configure view engine to render EJS templates.
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
//app.use(bodyp.json());
app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());


// Define routes.
app.get('/',
  function(req, res) {
    res.render('home');
  });

app.get('/login/facebook',
  passport.authenticate('facebook',{ scope: ['user_friends', 'user_photos','email'] }));


app.get('/login/facebook/return', 
  passport.authenticate('facebook', { failureRedirect: '/'}),
  function(req, res) {
    link="https://graph.facebook.com/v2.5/"+req.user.id+"/photos?access_token="+tkn+"&type=uploaded&limit=1000&fields=images";
    type="facebook";
    res.redirect('/goto_form');
  });

app.get('/goto_form',
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res){
    res.render('home1', { user: req.user, token:tkn });
  });
function get_Tags(resp,res,req)
{
    
    //instaResponse.data[0].images.standard_resolution.url
    console.log(resp.data.length);
    for(i = 0; i < resp.data.length; i++)
    {
        if(type=="facebook")
            Clarifai.getTagsByUrl(resp.data[i].images[0].source, {'model': 'travel-v1.0'}).then(handleResponse, handleError,check(resp,req,res));
        else
            Clarifai.getTagsByUrl(resp.datap[i].images.standard_resolution.url, {'model': 'travel-v1.0'}).then(handleResponse, handleError);
        
    }
    
        
}
function check(resp,req,res)
{
    console.log(i);
    console.log(counter);
    if(counter==resp.data.length)
        res.render('profile', { user: req.user, token:tkn, tags:tags });
}


app.post('/profiles',function (req, res){
//console.log(link);
console.log("body: "+req.body);
//request(link,function(error,response,body){
//    //console.log(response);
//    var resp = JSON.parse(body);
//    get_Tags(resp,res,req);
//    
//});
places2=[{name:"santa monica",number:1},{name:"venice beach",number:2},{name:"venice beach",number:2},{name:"venice beach",number:2},{name:"venice beach",number:2},{name:"venice beach",number:2},{name:"venice beach",number:2},{name:"venice beach",number:2}];
places=["los angeles","san diego","san francisco","atlanta"];
contents="hi"
 res.render('profile',{placed:places2,c:contents})
});         

app.get('/auth/instagram',
  passport.authenticate('instagram',{ scope: ['public_content'] }));

app.get('/auth/instagram/callback', 
  passport.authenticate('instagram', { failureRedirect: '/' }),
  function(req, res) {
    link="https://api.instagram.com/v1/users/self/media/recent/?access_token="+tkn+"&count=1000";
    type="instagram";
    res.redirect('/goto_form');
  });

app.get('/logout', function (req, res){
  req.logOut()  // <-- not req.logout();
  res.redirect('/')
});

app.listen(3000);