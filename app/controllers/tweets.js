// ## Tweet Controller
const mongoose = require("mongoose");
const Tweet = mongoose.model("Tweet");
const Analytics = mongoose.model("Analytics");
const _ = require("underscore");

function logAnalytics(req) {
  const url = req.protocol + "://" + req.get("host") + req.originalUrl;
  if (req.ip !== undefined) {
    const crudeIpArray = req.ip.split(":");
    const ipArrayLength = crudeIpArray.length;
    // cleanup IP to remove unwanted characters
    const cleanIp = crudeIpArray[ipArrayLength - 1];
    if (req.get("host").split(":")[0] !== "localhost") {
      const analytics = new Analytics({
        ip: cleanIp,
        user: req.user,
        url: url
      });
      analytics.save(err => {
        if (err) {
          console.log(err);
        }
      });
    }
  }
}

exports.tweet = (req, res, next, id) => {
  logAnalytics(req);
  Tweet.load(id, (err, tweet) => {
    if (err) {
      return next(err);
    }
    if (!tweet) {
      return next(new Error("Failed to load tweet" + id));
    }
    req.tweet = tweet;
    next();
  });
};

// ### Create a Tweet
exports.create = (req, res) => {
  logAnalytics(req);
  const tweet = new Tweet(req.body);
  tweet.user = req.user;
  tweet.uploadAndSave({}, err => {
    if (err) {
      res.render("500");
    } else {
      res.redirect("/");
    }
  });
};

// ### Show Tweet
exports.show = (req, res) => {
  logAnalytics(req);
  res.render("tweets/show", {
    title: req.tweet.title,
    tweet: req.tweet
  });
};

// ### Update a tweet
exports.update = (req, res) => {
  logAnalytics(req);
  let tweet = req.tweet;
  tweet = _.extend(tweet, {"body": req.body.tweet});
  tweet.uploadAndSave({}, (err) => {
    if (err) {
      return res.render("500");
    }
    res.redirect("/");
  });
};

// ### Delete a tweet
exports.destroy = (req, res) => {
  logAnalytics(req);
  const tweet = req.tweet;
  tweet.remove(err => {
    if (err) {
      return res.render("500");
    }
    res.redirect("/");
  });
};

exports.index = (req, res) => {
  logAnalytics(req);
  const page = (req.param("page") > 0 ? req.param("page") : 1) - 1;
  const options = {
    perPage: 10,
    page: page
  };
  Tweet.list(options, (err, tweets) => {
    if (err) {
      return res.render("500");
    }
    Tweet.countUserTweets(req.user._id, (err, tweetCount) => {
      if (err) {
        return res.render("500");
      }
      let followingCount = req.user.following.length;
      let followerCount = req.user.followers.length;
      Analytics.list({ perPage: 15 }, (err, analytics) => {
        if (err) {
          res.render("500");
        }
        res.render("tweets/index", {
          title: "List of Tweets",
          tweets: tweets,
          analytics: analytics,
          page: page + 1,
          tweetCount: tweetCount,
          followerCount: followerCount,
          followingCount: followingCount
        });
      });
    });
  });
};
