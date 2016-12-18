from django.shortcuts import render
from django.views import defaults
from django.utils.encoding import force_text

from rest_framework import status
from rest_framework.renderers import JSONRenderer, BrowsableAPIRenderer
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.views import APIView
from rest_framework.exceptions import APIException

from num_recognition_app import ml


def index(request):
    return render(request, 'num_recognition_app/index.html')


@api_view(['GET'])
def test(request, format=None):
    return Response("hahaha")


class MLTrainingData(APIView):
    renderer_classes = (JSONRenderer, BrowsableAPIRenderer)
    # parser_classes = (JSONParser,)

    def get(self, request, format=None):
        return Response(ml.num_recognition_model.training_data)

    def post(self, request, format=None):
        try:
            ml.num_recognition_model.add_training_data(request.data)
            ml.num_recognition_model.write_training_data()
        except ValueError as e:
            raise CustomException(e, "Error", status.HTTP_400_BAD_REQUEST)
        else:
            return Response("Successfully adding training data")


class MLPredict(APIView):
    renderer_classes = (JSONRenderer, BrowsableAPIRenderer)

    def post(self, request, format=None):
        # do prediction with request post data
        try:
            result = ml.num_recognition_model.predict_data(request.data)
        except ValueError as e:
            raise CustomException(e, "Error", status.HTTP_400_BAD_REQUEST)
        else:
            return Response(result)


class MLCreateModel(APIView):
    renderer_classes = (JSONRenderer, BrowsableAPIRenderer)

    def get(self, request, format=None):
        try:
            trained_data = ml.num_recognition_model.train_csv_data()
        except Exception as e:
            raise CustomException(e, "Error", status.HTTP_400_BAD_REQUEST)
        else:
            return Response(trained_data)


class CustomException(APIException):
    """
    Raising custom exception from Django REST
    http://stackoverflow.com/questions/33475334/django-rest-framework-how-to-specify-error-code-when-raising-validation-error-in
    """
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = 'A server error occurred.'

    def __init__(self, message, field, status_code):
        if status_code is not None:
            self.status_code = status_code

        if message:
            self.detail = {field: force_text(message)}
        else:
            self.detail = {'detail': force_text(self.default_detail)}