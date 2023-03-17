const createError = require('http-errors');
const express = require('express');
const session = require('express-session');
const MongoClient = require('mongodb').MongoClient;
const { ObjectId } = require('mongodb');
/*const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const User = require('./models/user');*/
const expressValidator = require('express-validator');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
// Import the mongoose module
const mongoose = require('mongoose');
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const catalogRouter = require('./routes/catalog'); //Import routes for 'catalog' area of site
//const pieChartsRouter = require('./public/javascripts/pieChart');
// const User = require('./models/user');
const app = express();

// Set `strictQuery: false` to globally opt into filtering by properties that aren't in the schema
// Included because it removes preparatory warnings for Mongoose 7.
// See: https://mongoosejs.com/docs/migrating_to_6.html#strictquery-is-removed-and-replaced-by-strict
mongoose.set('strictQuery', false);

// Define the database URL to connect to.
// Wait for database to connect, logging an error if there is a problem 
/*main().catch(err => console.log(err));
async function main() {
  await mongoose.connect(mongoDB, { useUnifiedTopology: true, useNewUrlParser: true });
}*/

mongoose.connect(process.env.mongoDB, { useUnifiedTopology: true, useNewUrlParser: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'mongo connection error'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(logger('dev'));
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));
// app.use(express.static('public'));
app.use(express.static(path.resolve('./public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/catalog', catalogRouter); // Add catalog routes to middleware chain.
//app.use('/pieCharts', pieChartsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// This chunck of code sets all user ids to accessLevel = "user" except Philippe's
const client = new MongoClient(process.env.mongoDB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    await client.connect();
    console.log('Connected successfully to server');

    const collection = client.db('family_office').collection('users');

    // update one document with accessLevel: "admin"
    const result1 = await collection.updateOne({ _id: new ObjectId('63ee438a16dafa473dd9b93f') }, { $set: { accessLevel: "admin", approver: "true" } });
    console.log(`${result1.matchedCount} document(s) matched the filter.`);
    console.log(`${result1.modifiedCount} document(s) updated.`);

    // update all other documents with accessLevel: "user"
    const result2 = await collection.updateMany({ _id: { $ne: new ObjectId('63ee438a16dafa473dd9b93f') }, accessLevel: { $ne: 'admin' } }, { $set: { accessLevel: "user"} });
    console.log(`${result2.matchedCount} document(s) matched the filter.`);
    console.log(`${result2.modifiedCount} document(s) updated.`);
    // update all other documents with accessLevel: "user"
    const result3 = await collection.updateMany({ _id: { $ne: new ObjectId('63ee438a16dafa473dd9b93f') } }, { $set: { approver: "false" } });
    console.log(`${result3.matchedCount} document(s) matched the filter.`);
    console.log(`${result3.modifiedCount} document(s) updated.`);
  } catch (err) {
    console.log(err.stack);
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

run();

module.exports = app;
