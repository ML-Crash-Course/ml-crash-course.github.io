/* Machine Learning Crash Course: module manifest. app.js creates window.M4 first; this file only assigns. */
M4.modules = [
  {"id":"vectors","track":"Math foundations","title":"Vectors","color":"blue","blurb":"Arrows, components, dot products and span.","lessons":["vectors-s1","vectors-s2","vectors-s3","vectors-s4"]},
  {"id":"matrices","track":"Math foundations","title":"Matrices and linear maps","color":"purple","blurb":"A matrix moves the whole grid at once.","lessons":["matrices-s1","matrices-s2","matrices-s3","matrices-s4"]},
  {"id":"eigen","track":"Math foundations","title":"Bases and eigenvectors","color":"pink","blurb":"Directions that a matrix only stretches.","lessons":["eigen-s1","eigen-s2","eigen-s3","eigen-s4"]},
  {"id":"functions","track":"Math foundations","title":"Exponentials and logarithms","color":"orange","blurb":"The functions and notation every ML formula uses.","lessons":["functions-s1","functions-s2","functions-s3","functions-s4"]},
  {"id":"calculus","track":"Math foundations","title":"Derivatives","color":"green","blurb":"How an output responds to a small change in one input.","lessons":["calculus-s1","calculus-s2","calculus-s3"]},
  {"id":"multivariable","track":"Math foundations","title":"Gradients and Hessians","color":"red","blurb":"Slopes and curvature of functions of many variables.","lessons":["calculus-s4","mv-s1","mv-s2","mv-s3","mv-s4"]},
  {"id":"probability","track":"Math foundations","title":"Probability","color":"yellow","blurb":"Distributions, expectation, Bayes rule and the Gaussian.","lessons":["probability-s1","probability-s2","probability-s3","probability-s4"]},
  {"id":"l1","track":"Machine learning","title":"Models and predictions","color":"blue","blurb":"What a model is, how it is trained and how it is evaluated.","lessons":["l1-s1","l1-s2","l1-s3","l1-s4"]},
  {"id":"mle","track":"Machine learning","title":"Maximum likelihood","color":"purple","blurb":"Losses derived from the probability of the data.","lessons":["l2-s1","l2-s2","l2-s3","mle-s1"]},
  {"id":"info","track":"Machine learning","title":"Information theory","color":"yellow","blurb":"Surprise, entropy, cross-entropy and KL divergence.","lessons":["info-s1","l2-s4","info-s2"]},
  {"id":"optimisation","track":"Machine learning","title":"Gradient descent","color":"green","blurb":"Walking downhill on a loss landscape.","lessons":["optimisation-s1","optimisation-s2","l3-s1","optimisation-s3","l3-s2","optimisation-s4"]},
  {"id":"optimizers","track":"Machine learning","title":"Advanced optimizers","color":"orange","blurb":"Mini-batch noise, momentum, adaptive step sizes, Adam and conditioning.","lessons":["opt-s1","l3-s3","l3-s4","opt-s2"]},
  {"id":"generalisation","track":"Machine learning","title":"Generalization","color":"green","blurb":"Fitting the data you have without memorizing its noise.","lessons":["gen-s1","gen-s2"]},
  {"id":"nn","track":"Machine learning","title":"Neural networks","color":"pink","blurb":"Layers as geometric transformations of space.","lessons":["l4-s1","l4-s2","l4-s4"]},
  {"id":"backprop","track":"Machine learning","title":"Backpropagation","color":"red","blurb":"The chain rule, applied to a whole network.","lessons":["bp-s1","l4-s3","bp-s2"]},
  {"id":"training","track":"Machine learning","title":"Training a network","color":"purple","blurb":"Width, depth and learning rate, tried out on networks that train in the browser.","lessons":["net-s1"]},
  {"id":"language","track":"Language","title":"Language models","color":"orange","blurb":"Tokens, word vectors, next-word prediction, attention and transformers.","lessons":["tok-s1","emb-s1","emb-s2","emb-s3","emb-s4"]}
];
