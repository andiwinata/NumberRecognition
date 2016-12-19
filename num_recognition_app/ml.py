import csv
import ast
from sklearn import svm, datasets
import numpy as np


class NumRecognitionMLModel:
    features_key = "features"
    label_key = "label"

    csv_file_path = 'num_recognition_training_data.csv'

    classifier_model = None

    def __init__(self):
        self.training_data = []

    def add_training_data(self, data):
        """
        Adding the data into the list
        """
        if (not isinstance(data, dict) or
                    self.features_key not in data or
                    self.label_key not in data):
            raise ValueError("Training data is not in correct format")

        try:
            label_data = int(data[self.label_key])
        except ValueError:
            raise ValueError("Label data is not integer")

        if not (0 <= label_data <= 9):
            raise ValueError("Label data should always be between 0-9")

        self.training_data.append(data)

    def write_training_data(self):
        """
        Adding last element of training data list into csv file
        """
        with open(self.csv_file_path, 'a') as f:
            writer = csv.writer(f, delimiter=',', lineterminator='\n')

            # write just one last row
            train_data = self.training_data[-1]
            writer.writerow([train_data[self.label_key], train_data[self.features_key]])

            # write all data
            # for train_data in self.training_data:
            #     writer.writerow([train_data[self.label_key], train_data[self.features_key]])
            # writer = csv.DictWriter(f, keys)
            # writer.writeheader()
            # writer.writerows(self.training_data)

    def predict_data(self, data):
        # check dictionary
        if not isinstance(data, dict) or self.features_key not in data:
            raise ValueError("Data to be predicted is not formatted properly")

        feature_data = data[self.features_key]
        # check if features is array
        if not (isinstance(feature_data, list) or isinstance(feature_data, tuple)):
            raise ValueError("Feature data is not list or tuple")

        # multiply by 16 to make it equal with sklearn default
        feature_data = np.array(feature_data, dtype='uint8') * 16

        prediction = -1
        # do data prediction only if classifier is exist
        if self.classifier_model:
            prediction = self.classifier_model.predict([feature_data])[0]

        # return the result
        return prediction

    def train_data(self, train_data_source='sklearn'):
        """
        Train data depending on the source

        - sklearn = get data default from sklearn.datasets.load_digits()
        - csv = get digit data from collected csv data
        """

        if train_data_source == 'sklearn':
            self.train_sklearn_data()
        else:
            self.train_csv_data()

        return 'Successfuly training data with train data source: {}'.format(train_data_source)

    def train_sklearn_data(self):
        """
        This training data comes by default from sklearn
        http://scikit-learn.org/stable/auto_examples/classification/plot_digits_classification.html

        it has values from 0-16
        """
        digits = datasets.load_digits()
        n_samples = len(digits.images)
        data = digits.images.reshape((n_samples, -1))

        self.classifier_model = svm.SVC(gamma=0.001)
        self.classifier_model.fit(data, digits.target)

    def train_csv_data(self, gamma = 0.06, C=10):
        """
        Training data using csv data,
        Gamma and C is ideally retrieved from splitting
        training data into training, and cross validation set
        (the current gamma and C comes from testing in .ipynb)
        """
        csv_data = self.get_csv_data()
        labels = csv_data[self.label_key]
        features = csv_data[self.features_key]

        # convert to numpy array
        labels = np.array(labels, dtype='uint8')

        # multiply by 16 to make it equal with sklearn default
        features = np.array(features, dtype='float_') * 16

        # create random state to maintain randomness
        self.classifier_model = svm.SVC(gamma=gamma, C=C)
        self.classifier_model.fit(features, labels)

    def get_csv_data(self):
        train_labels = []
        train_features = []
        with open(self.csv_file_path) as csvfile:
            data_reader = csv.reader(csvfile, delimiter=',')
            for row in data_reader:
                train_labels.append(row[0])
                features = ast.literal_eval(row[1])
                train_features.append(features)

        return {
            self.label_key: train_labels,
            self.features_key: train_features
        }


num_recognition_model = NumRecognitionMLModel()
