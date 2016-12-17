import csv
import sklearn

class NumRecognitionMLModel:
    features_key = "features"
    label_key = "label"

    file_path = 'num_recognition_training_data.csv'

    def __init__(self):
        self.training_data = []

    def add_training_data(self, data):
        if (not isinstance(data, dict) or
                self.features_key not in data or
                self.label_key not in data):
            raise ValueError("Training data is not in correct format")

        try:
            label_data = int(data[self.label_key])
        except ValueError:
            raise ValueError("Label data is not integer")

        if not(0 <= label_data <= 9):
            raise ValueError("Label data should always be between 0-9")

        self.training_data.append(data)

    def write_training_data(self):
        with open(self.file_path, 'a') as f:
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

        # do data prediction

        # return the result
        return "predicted number!"

num_recognition_model = NumRecognitionMLModel()
