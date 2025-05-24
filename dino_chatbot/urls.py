from django.urls import path
from . import views

urlpatterns = [
    path('', views.index_views, name='home'),
    path('about/', views.about_views, name="about"),
    path('usage/', views.usage_views, name="usage"),
    path('statistic/', views.statistic_views, name="statistic"),
    path('get-statistics/', views.get_statistics, name='get_statistics'),
    path('get-survival/', views.get_survival, name='get_survival'),
]