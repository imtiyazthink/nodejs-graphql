const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const Post = require("../models/post");
const mongoose = require("mongoose");

module.exports = {
  createUser: async (args, req) => {
    const email = args.userInput.email;
    const password = args.userInput.password;
    const name = args.userInput.name;
    if (!validator.isEmail(email)) {
      const error = new Error("E-mail is invalid");
      error.code = 422;
      throw error;
    }
    if (
      validator.isEmpty(password) ||
      !validator.isLength(password, { min: 5 })
    ) {
      const error = new Error("Password too short");
      error.code = 422;
      throw error;
    }
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      const error = new Error("User already exist");
      error.code = 422;
      throw error;
    }
    const hashPass = await bcrypt.hash(password, 12);
    const user = new User({
      email: email,
      name: name,
      password: hashPass,
    });
    const createdUser = await user.save();
    return {
      ...createdUser._doc,
      _id: createdUser._id.toString(),
    };
  },
  login: async function ({ email, password }) {
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error("User not found.");
      error.code = 401;
      throw error;
    }
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error("Password is incorrect.");
      error.code = 401;
      throw error;
    }
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      "secret",
      { expiresIn: "1h" }
    );
    return { token: token, userId: user._id.toString() };
  },
  createPost: async (args, req) => {
    const creator = req.userId;
    const title = args.postInput.title;
    const content = args.postInput.content;
    const imageUrl = args.postInput.imageUrl;

    if (!req.userId) {
      const error = new Error("Not authenticated!");
      throw error;
    }
    const errors = [];
    if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
      errors.push({ message: "Title is invalid." });
    }
    if (
      validator.isEmpty(content) ||
      !validator.isLength(content, { min: 5 })
    ) {
      errors.push({ message: "Content is invalid." });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const user = await User.findById(creator);
    if (!user) {
      const error = new Error("User Not Found.");
      error.code = 404;
      throw error;
    }
    const post = new Post({
      title: title,
      content: content,
      imageUrl: imageUrl,
      creator: creator,
    });
    const createdPost = await post.save();
    user && user.posts.push(createdPost);
    await user.save();
    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
    };
  },
  posts: async ({ page }, req) => {
    if (!req.userId) {
      const error = new Error("Not authenticated!");
      error.code = 403;
      throw error;
    }
    if (!page) {
      page = 1;
    }
    const perPage = 2;
    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find({ creator: req.userId })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate("creator");
    return {
      posts: posts.map((p) => {
        return {
          ...p._doc,
          _id: p._id.toString(),
        };
      }),
      totalPosts: totalPosts,
    };
  },
  post: async ({ id }, req) => {
    const errors = [];

    if (!req.userId) {
      const error = new Error("Not authenticated!");
      error.code = 403;
      throw error;
    }
    if (!mongoose.isValidObjectId(id)) {
      errors.push({ message: "Invaild Post ID." });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const post = await Post.findById(id).populate("creator");
    if (!post) {
      const error = new Error("No post found!");
      error.code = 404;
      throw error;
    }
    return {
      ...post._doc,
      _id: post._id.toString(),
    };
  },
  updatePost: async ({ id, postInput }, req) => {
    if (!req.userId) {
      const error = new Error("Not authenticated!");
      error.code = 403;
      throw error;
    }
    const post = await Post.findById(id).populate("creator");
    if (!post) {
      const error = new Error("No post found!");
      error.code = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }

    post.title = postInput.title;
    post.content = postInput.content;

    const updatedPost = await post.save();
    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
    };
  },
  deletePost: async ({ id }, req) => {
    if (!req.userId) {
      const error = new Error("Not authenticated!");
      error.code = 403;
      throw error;
    }
    const post = await Post.findById(id);
    if (!post) {
      const error = new Error("No post found!");
      error.code = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }
    await Post.findByIdAndRemove(id);
    const user = await User.findById(req.userId);
    user.posts.pull(id);
    await user.save();
    return "Post Deleted Successfully";
  },
  user: async (args, req) => {
    if (!req.userId) {
      const error = new Error("Not authenticated!");
      error.code = 403;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("No user found!");
      error.code = 404;
      throw error;
    }
    return { ...user._doc, _id: user._id.toString() };
  },
};
