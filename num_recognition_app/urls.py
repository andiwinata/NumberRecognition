from django.conf.urls import url, include
from rest_framework.urlpatterns import format_suffix_patterns
from num_recognition_app import views

urlpatterns = [
    url(r'^$', views.index),
    url(r'^api/test', views.test),
    url(r'^api/ml-model/train', views.MLTraining.as_view()),
    url(r'^api/ml-model/predict', views.MLPredict.as_view())
]