var express = require('express');
var http = require("http")
var parser=require("xml2js").parseString;
var request = require('request');
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
var places=[];
var city;
var finalres;
removeArr = ['People', 'Television', 'Entrance', 'Logo', 'Details', 'Summer', 'Stairs', 'Winter','Spring','Autumn', 'Restaurant', 'Wedding', 'Daytime', 'Food & Beverages', 'Reception', 'Terrace', 'Wardrobe', 'Bed', 'Kids Area', 'Breakfast Buffet', 'Couch', 'Living Room', 'Building', 'Nighttime', 'Fireplace', 'Gift Shop', 'Coffee Machine', 'Ballroom', 'Internet Area', 'Telephone', 'Bathroom Amenities', 'Lamp', 'Fountain', 'Bar'];
typeFilter = ['accounting', 'airport', 'atm', 'bakery', 'bank', 'bar', 'beauty_salon', 'bicycle_store', 'book_store', 'bus_station', 'car_dealer', 'car_rental', 'car_repair', 'car_wash', 'cemetery', 'city_hall', 'clothing_store', 'convenience_store', 'courthouse', 'dentist', 'department_store', 'doctor', 'electrician', 'electronics_store', 'embassy', 'finance', 'fire_station', 'florist', 'food', 'funeral_home', 'furniture_store', 'gas_station', 'general_contractor', 'grocery_or_supermarket', 'gym', 'hair_care', 'hardware_store', 'health', 'home_goods_store', 'hospital', 'insurance_agency', 'jewelry_store', 'laundry', 'lawyer', 'library', 'liquor_store', 'local_government_office', 'locksmith', 'meal_delivery', 'meal_takeaway', 'movie_rental', 'movie_theater', 'moving_company', 'painter', 'parking', 'pet_store', 'pharmacy', 'physiotherapist', 'plumber', 'police', 'post_office', 'real_estate_agency', 'restaurant', 'roofing_contractor', 'school', 'shoe_store', 'storage', 'store', 'subway_station', 'taxi_stand', 'train_station', 'transit_station', 'travel_agency', 'university', 'veterinary_care', 'church', 'place_of_worship', 'mosque', 'premise', 'temple', 'cafe'];
map = {'Garden':['Garden','Park','National Park'], 'Snow & Ski Sports':['Snow Ski'], 'Animals':['Zoo'], 'Building':['Monument'], 'Surroundings':['Overlook'], 'View':['Overlook']};

function getPlace(tag, place)
{
    console.log(place);
    if(placeExists(place.name[0]) == undefined)
        { 
            var jObj = {};
            jObj['name'] = place.name[0];
            jObj['address'] = place.formatted_address[0];
            jObj['lat'] = place.geometry[0].location[0].lat[0];
            jObj['lon'] = place.geometry[0].location[0].lng[0];
            jObj['tags'] = [];
            jObj['tags'].push(tag.toLowerCase().replace(/\s+/g, "-"));
            jObj['photo'] = '';
            //console.log(place.photo);
            if(place.photo != undefined)
            {
                jObj['photo'] = 'https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=' + place.photo[0].photo_reference + '&key=AIzaSyA6sfGYa21RdwF8L2muePF-naQMCFNpFMk';
            }
            else
            {
                jObj['photo'] = 'img/notfound.jpg';
            }
            places.push(jObj); 
        }
        else
            if(placeExists(place.name[0])['tags'].indexOf(tag.toLowerCase().replace(/\s+/g, "-")) < 0)
                placeExists(place.name[0])['tags'].push(tag.toLowerCase().replace(/\s+/g, "-"));
}

function placeExists(name)
{
    for (var i = 0; i < places.length; i++) 
        if (places[i].name === name)
            return places[i];
}

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
    link="https://graph.facebook.com/v2.5/"+req.user.id+"/photos?access_token="+tkn+"&type=uploaded&limit=10&fields=images";
    type="facebook";
    res.redirect('/goto_form');
  });

app.get('/goto_form',
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res){
    res.render('home1', { user: req.user, token:tkn });
  });
  
app.post('/profiles',function (req, res,next){ 
    city=req.body.placetext;
    async.waterfall([
        function(callback){
            tags = [];
            request(link, function(error, response, body){
               if(!error && response.statusCode == 200){
                    var FBresponse = JSON.parse(body);
                    console.log(FBresponse.data.length);
                    async.forEach(FBresponse.data, function (image, callback) {
                        Clarifai.getTagsByUrl(image.images[0].source, {'model': 'travel-v1.0'}).then(function (cResponse){
                        classes = cResponse.results[0].result.tag.classes;
                        probs = cResponse.results[0].result.tag.probs;
                        probs.forEach(getTags);
                        return callback();
                        }, function (err){
                            console.log(err);
                            return callback();
                        });
                    }, function (err) {
                        if (err) { throw err; }
                        else callback(null, tags);
                        });
               }
            });
        },
        function(tags, callback){
            console.log(tags);
            places = [];
            async.forEach(tags, function(tag, callback){
                var googleLink = "https://maps.googleapis.com/maps/api/place/textsearch/xml?query=" + encodeURIComponent(tag.toLowerCase() + " in " + city) + "&key=AIzaSyCRnt2j53o4RnwdN2pwXBIdGz4Ksd054tM"
                request(googleLink, function(error, response, body) {
                if(!error && response.statusCode == 200){
                    parser(body, function (err, result) { 
                        var res = result.PlaceSearchResponse.result;
                        async.forEach(res, function (place, callback) {
                            var flag = true;
                            if('type' in place)
                            {
                                for (var j = 0; j < place.type.length; j++)
                                {
                                    if(typeFilter.indexOf(place.type[j]) >= 0)
                                        flag = false;
                                }
                            }
                            if(flag == true)
                                getPlace(tag, place);
                            return callback();
                        }, function (err) {
                                if (err) { throw err; }
                                return callback();
                        });
                    });
                }
            });
            }, function (err) {
                if (err) { throw err; }
                else 
                    callback(null, places);
            });
        },
        function(places, callback){
            console.log("last" + places.length);
            res.render('profile', {tags: tags, raakhi: places});
            callback(null, "Success!");
        }
    ], function(err, result){
            if(err) { throw err; }
    });
});         

app.get('/auth/instagram',
  passport.authenticate('instagram',{ scope: ['public_content'] }));

app.get('/auth/instagram/callback', 
  passport.authenticate('instagram', { failureRedirect: '/' }),
  function(req, res) {
    link="https://api.instagram.com/v1/users/self/media/recent/?access_token="+tkn+"&count=10";
    type="instagram";
    res.redirect('/goto_form');
  });

app.get('/logout', function (req, res){
  req.logout();  // <-- not req.logout();
  res.redirect('/');
});

app.listen(3000);