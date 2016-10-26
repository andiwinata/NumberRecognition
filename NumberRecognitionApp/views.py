from django.shortcuts import render

from rest_framework import status
from rest_framework.renderers import JSONRenderer, BrowsableAPIRenderer
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.views import APIView


@api_view(['GET'])
def test(request, format=None):
    return Response("hahaha")


class MLModel(APIView):
    renderer_classes = (JSONRenderer, BrowsableAPIRenderer)

    def get(self, request, format=None):
        content = {
            'Status': 'Accepted',
            'Hem': None,
            'Lava': 50
        }
        return Response(content)
