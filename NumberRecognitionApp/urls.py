from django.conf.urls import url, include
from rest_framework.urlpatterns import format_suffix_patterns
from NumberRecognitionApp import views

urlpatterns = [
    url(r'^test', views.test),
    url(r'^ml-model/train', views.MLModel.as_view())
]