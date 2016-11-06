import csv

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

        self.training_data.append(data)

    def write_training_data(self):
        keys = self.training_data[0].keys()
        with open(self.file_path, 'a') as f:
            writer = csv.writer(f, delimiter=',', lineterminator='\n')
            for train_data in self.training_data:
                writer.writerow(train_data.values())
            # writer = csv.DictWriter(f, keys)
            # writer.writeheader()
            # writer.writerows(self.training_data)

num_recognition_model = NumRecognitionMLModel()
