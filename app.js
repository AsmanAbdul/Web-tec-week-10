const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const db = new sqlite3.Database('database.db');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

// Create tables
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_name TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS user_courses (
            user_id INTEGER,
            course_id INTEGER,
            PRIMARY KEY (user_id, course_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (course_id) REFERENCES courses(id)
        )
    `);

    // Insert sample courses
    const courses = ['Math', 'Science', 'History', 'Art'];
    courses.forEach(course => {
        db.run(`INSERT INTO courses (course_name) VALUES (?)`, [course]);
    });
});

// Helper functions
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Routes
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, user) => {
        if (user) {
            req.session.user = user;
            res.redirect('/select_courses');
        } else {
            res.redirect('/login');
        }
    });
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, password], (err) => {
        if (err) {
            return res.redirect('/register');
        }
        res.redirect('/login');
    });
});

app.get('/select_courses', isAuthenticated, (req, res) => {
    db.all(`SELECT * FROM courses`, (err, courses) => {
        res.render('select_courses.html', { user: req.session.user, courses });
    });
});

app.post('/select_courses', isAuthenticated, (req, res) => {
    const selectedCourses = req.body.courses;
    db.run(`DELETE FROM user_courses WHERE user_id = ?`, [req.session.user.id], (err) => {
        if (selectedCourses) {
            const courses = Array.isArray(selectedCourses) ? selectedCourses : [selectedCourses];
            courses.forEach(courseId => {
                db.run(`INSERT INTO user_courses (user_id, course_id) VALUES (?, ?)`, [req.session.user.id, courseId]);
            });
        }
        res.redirect('/my_courses');
    });
});

app.get('/my_courses', isAuthenticated, (req, res) => {
    db.all(`
        SELECT courses.course_name FROM courses
        JOIN user_courses ON courses.id = user_courses.course_id
        WHERE user_courses.user_id = ?
    `, [req.session.user.id], (err, courses) => {
        res.render('my_courses.html', { user: req.session.user, courses });
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Set view engine to render HTML
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// Start server
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
