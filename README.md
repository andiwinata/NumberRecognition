# README #

### Summary ###

Project name: **Number Recognition**

Video showcase: https://www.youtube.com/watch?v=Emt7cQfvIz8

This project is about predicting drawn number in HTML canvas (pixel art style) using machine learning.
Can be seen as digit recognition project.

**Stacks used:**

Backend:

* Django
* Django-REST framework
* Scikit-learn

Dev dependencies:

* Jupyter notebook (ipynb)

Frontend:

* HTML5
* SASS
* Vanilla JS
* A tiny traces of Foundation by ZURB

### How do I get set up? ###

* Use Python 3 (3.5)
* I'm using anaconda as python package manager
* There is `environment.yaml` in the root folder containing all python dependencies, but if you want to install only necessary stuffs,
just install packages listed in `Backend` section above
* Here is how to install the requirement file in conda: `conda env create -f path/to/environment.yaml`
* After everything setup, run `python manage.py runserver 0.0.0.0:8000` in terminal from the root folder, this will run the dev server in your `localhost:8000` or `127.0.0.1:8000` and will be accessible by your LAN
* Then you are setup! you can start using it now

___

### Usage ###

In `http://root_url` (e.g. `http://localhost:8000`), there are 2 functions, *Predict Data* and *Train Data*.

##### Predict Data #####

*Predict Data* will POST pixel data as `features` to `http://root_url/api/ml-model/predict`, and the server will use the machine learning model to try predict the number and gives the response with predicted number.

The machine learning model needs to be trained first in order for this application to works, if it has not been trained, it will return `-1` value as the predicted number

To train the model, make a GET request to `http://root_url/api/ml-model/train-model`, there is optional parameter for predicted model to use which training data.

* By default it will use scikit-learn digit recognition training dataset for training
* To specify other source (at the moment, the only other option is by using csv file which are collected from *Train Data* option), make a request with keyword parameter "train-data-source" (e.g. `http://root_url/api/ml-model/train-model?train-data-source=csv`)

The response from server should return indication that the model has been successfully trained, once it is trained, it should be able to predict the number and returning the correct number (if the model is trained properly)

##### Train Data #####

* *Train Data* will POST pixel data and digit data as `label` and `features` to the `http://root_url/api/ml-model/training-data`. The server will then store it in list as well as append it to csv file.
* To see stored `label` and `features` pair in in-memory-python-list, send a GET request to `http://root_url/api/ml-model/training-data`. You can see the stored training data in the csv file by directly going to the `num_recognition_training_data.csv` at the root level of project

___

*Notes:*
`./num_recognition_app/urls.py` handle all routing for the number recognition app

___

### Development Notes ###

* The `num_recognition_training_data.csv` file in the root level of project contains 800 training data set. The data came from 10x10 Canvas pixel with 2x2 brush, and they are not a good dataset (there are quite some inconsistencies) so it will be unusable for the current state of application. 

* So instead I just used scikit-learn *digit recognition* dataset, and changing the canvas to 8x8 with 1x1 brush. But since many dataset from scikit-learn is gearing towards stretched vertical size (the height of drawn number is always full height of canvas, but the width is probably just half width of canvas, so the aspect ratio will always be 1:>1 (w:h)), in order to get the correct result, you need to draw it the same as how the training dataset is, draw the number with half width x full height of the canvas.

* Right now, it is only using SVM to predict number separation

* There is `Training.ipynb` file containing traces of progress of training using the `num_recongition_training_data.csv` file, which wasn't very successful to get high percentage of precision, recall and f-score. (Have tried SVM and neural networks from scikit-learn)

* `sklearn_digit_test.ipynb` contains experimenting around scikit-learn digit recognition digit dataset to see how to make it suitable for this application

___