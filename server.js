const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const bcrypt = require('bcrypt');
const app = express();
const db = new sqlite3.Database(':memory:');

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public')); // Serve static files from the "public" directory
app.use(session({
    secret: 'secretKey',
    resave: false,
    saveUninitialized: true,
}));

// Create tables
db.serialize(() => {
    db.run('CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, password TEXT)');
    db.run('CREATE TABLE rides (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, price REAL, contact TEXT, details TEXT, FOREIGN KEY(user_id) REFERENCES users(id))');
});

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Routes
app.get('/', (req, res) => {
    res.render('index', { userId: req.session.userId });
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword], function(err) {
        if (err) {
            return console.log(err.message);
        }
        res.redirect('/login');
    });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            return console.log(err.message);
        }
        if (user && bcrypt.compareSync(password, user.password)) {
            req.session.userId = user.id;
            res.redirect('/');
        } else {
            res.redirect('/login');
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/offer-ride', isAuthenticated, (req, res) => {
    res.render('offer-ride', { userId: req.session.userId });
});

app.post('/offer-ride', isAuthenticated, (req, res) => {
    const { user_id, type, price, contact, details } = req.body;
    db.run('INSERT INTO rides (user_id, type, price, contact, details) VALUES (?, ?, ?, ?, ?)', [user_id, type, price, contact, details], function(err) {
        if (err) {
            return console.log(err.message);
        }
        res.redirect('/');
    });
});

app.get('/rides', (req, res) => {
    const { type } = req.query;
    let query = 'SELECT * FROM rides';
    let params = [];
    if (type) {
        query += ' WHERE LOWER(type) = LOWER(?)';
        params.push(type);
    }
    db.all(query, params, (err, rows) => {
        if (err) {
            throw err;
        }
        res.render('rides', { rides: rows, filterType: type });
    });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
