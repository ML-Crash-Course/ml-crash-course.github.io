# Machine Learning Crash Course

Interactive lessons on the mathematics behind machine learning, from vectors to language models. Every idea comes with something to drag, a picture that moves with it, and exercises that check your answer on the spot.

**Live site:** https://ml-crash-course.github.io/

## What is inside

The course has 18 modules, meant to be taken in order. Each module builds on the ones before it.

| | Module | What you learn |
|---|---|---|
| 1 | Vectors | arrows, linear combinations, length, dot product |
| 2 | Matrices and linear maps | matrices as transformations, products, determinants, inverses |
| 3 | Bases and eigenvectors | change of basis, eigenvectors, diagonalisation |
| 4 | Exponentials and logarithms | exp, log, sigmoid, softmax |
| 5 | Derivatives | slopes, rules of differentiation, contour maps |
| 6 | Gradients and Hessians | partial derivatives, gradients, curvature, the chain rule for vectors |
| 7 | Probability | distributions, expectation, variance, the Gaussian |
| 8 | Models and predictions | models, parameters, losses |
| 9 | Maximum likelihood | where the common loss functions come from |
| 10 | Information theory | entropy, cross entropy, KL divergence |
| 11 | Gradient descent | learning rates, ravines, convergence |
| 12 | Advanced optimizers | momentum, RMSProp, Adam, minibatches |
| 13 | Generalization | overfitting and regularisation |
| 14 | Neural networks | neurons, layers, activations |
| 15 | Backpropagation | computation graphs and how gradients flow backwards |
| 16 | Normalization and residuals | initialisation, LayerNorm, skip connections |
| 17 | Training a network | putting the pieces together |
| 18 | Language models | tokens, embeddings, attention |

Several modules end with an endless practice drill. Each drill generates fresh problems, and you finish a level by solving a few of them correctly. A wrong answer never wipes your progress.

## Run it locally

The site is plain HTML, CSS and JavaScript with no build step.

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` directly from disk also works. Formulas need an internet connection once, to load KaTeX.

Progress, XP and your daily streak are saved in your browser. "Reset progress" is in the footer.

## How the code is organised

- `index.html` loads KaTeX, `assets/app.css`, `assets/app.js` (the lesson framework, global `M4`), `assets/drill.js` (generated practice), `assets/modules.js` (the list of modules), and then one file per lesson.
- `lessons/<id>.js` defines a lesson with a single `M4.lesson({...})` call. A lesson file that is missing shows as "coming soon".
- Routes: `#/` home, `#/m/<moduleId>` a module, `#/l/<lessonId>/<step>` a lesson step.
- `WRITING.md` holds the style rules for lesson text.
