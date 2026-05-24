// auth.js

const passport = require('passport');
const GitHubStrategy = require('passport-github').Strategy;
const session = require('express-session');

module.exports = function (app) {
    // 设置Session中间件
    app.use(session({
        secret: process.env.SESSION_SECRET || 'your_secret_key', // 使用环境变量或默认值
        resave: false,
        saveUninitialized: true
    }));

    // 初始化Passport并设置中间件
    app.use(passport.initialize());
    app.use(passport.session());

    // 使用GitHub策略配置Passport
    passport.use(new GitHubStrategy({
            clientID: process.env.GITHUB_CLIENT_ID, // 使用环境变量
            clientSecret: process.env.GITHUB_CLIENT_SECRET, // 使用环境变量
            callbackURL: `${process.env.APP_PROTOCOL}://${process.env.APP_HOST}/auth/github/callback`
        },
        function(accessToken, refreshToken, profile, done) {
            // 在这里可以保存用户信息到数据库
            return done(null, profile);
        }
    ));

    // 序列化与反序列化用户对象
    passport.serializeUser(function(user, done) {
	console.log(user)
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        // 这里应该查询数据库以找到对应的用户记录
        done(null, { id });
    });

    // GitHub认证路由
    app.get('/auth/github',
        (req, res, next) => {
            passport.authenticate('github', {
                callbackURL: `${req.protocol}://${req.get('host')}/auth/github/callback`
            })(req, res, next);
        }
    );

    // GitHub认证回调处理
    app.get('/auth/github/callback',
        (req, res, next) => {
            passport.authenticate('github', { failureRedirect: '/' }, (err, user, info) => {
                if (err || !user) {
                    return res.redirect('/');
                }
                req.logIn(user, function(err) {
                    if (err) { return next(err); }
                    return res.redirect('/');
                });
            })(req, res, next);
        }
    );

    // 登出路由
    app.get('/logout', (req, res, next) => {
        req.logout({ keepSessionInfo: false }, function(err) {
            if (err) { return next(err); }
            res.redirect('/');
        });
    });
};
