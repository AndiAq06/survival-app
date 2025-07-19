from django.test import TestCase, Client
from django.urls import reverse
import json
import numpy as np
from unittest.mock import patch

class ViewTests(TestCase):
    def setUp(self):
        self.client = Client()
        
        # Sample data for testing
        self.survival_data = {
            "time_to_event": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            "event_status": [1, 1, 1, 1, 1, 0, 0, 0, 0, 0]
        }
        
        self.numeric_stats_data = {
            "variable": "test_var",
            "data": [1, 2, 3, 4, 5],
            "isNumeric": True
        }
        
        self.categorical_stats_data = {
            "variable": "test_var",
            "data": ["A", "B", "A", "C", "B"],
            "isNumeric": False
        }

    # Test simple views
    def test_index_view(self):
        response = self.client.get(reverse('home'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'index.html')

    def test_about_view(self):
        response = self.client.get(reverse('about'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'about.html')

    def test_usage_view(self):
        response = self.client.get(reverse('usage'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'usage.html')

    def test_statistic_view(self):
        response = self.client.get(reverse('statistic'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'statistic.html')

    # Test statistics endpoint
    def test_get_statistics_numeric(self):
        response = self.client.post(
            reverse('get_statistics'),
            data=json.dumps(self.numeric_stats_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertIn('mean', data)
        self.assertIn('median', data)
        self.assertIn('std', data)
    
    def test_get_statistics_categorical(self):
        response = self.client.post(
            reverse('get_statistics'),
            data=json.dumps(self.categorical_stats_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertIn('uniqueCount', data)
        self.assertIn('mode', data)
    
    def test_get_statistics_invalid_data(self):
        response = self.client.post(
            reverse('get_statistics'),
            data='invalid json',
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
    
    def test_get_statistics_missing_variable(self):
        data_missing_variable = {
            "data": [1, 2, 3],
            "isNumeric": True
        }
        response = self.client.post(
            reverse('get_statistics'),
            data=json.dumps(data_missing_variable),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', json.loads(response.content))
    
    def test_get_statistics_empty_data(self):
        data_empty = {
            "variable": "empty_var",
            "data": [],
            "isNumeric": True
        }
        response = self.client.post(
            reverse('get_statistics'),
            data=json.dumps(data_empty),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', json.loads(response.content))
    

    # Test survival analysis endpoint with mocking
    @patch('view.utils.ask_openai')
    @patch('view.distributions.kaplan_meier_to_dict')
    @patch('view.helper.generate_visualizations')
    @patch('view.helper.calculate_survival_metrics')
    def test_get_survival_success(self, mock_metrics, mock_viz, mock_km, mock_openai):
        # Setup mock responses
        mock_openai.return_value = "weibull"
        mock_km.return_value = {"time": [1,2,3], "survival": [1,0.8,0.6]}
        mock_viz.return_value = {
            'kaplan_meier_plot': 'plot_data',
            'distribusi_plot': 'plot_data',
            'hazard_plot': 'plot_data',
            'survival_plot': 'plot_data',
            'survival_function': 'func_data'
        }
        mock_metrics.return_value = {
            'kaplan_meier': 'km_data',
            'median_survival': 5.0
        }

        response = self.client.post(
            reverse('get_survival'),
            data=json.dumps(self.survival_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertIn('predicted_distribution', data)
        self.assertIn('best_distribution', data)
        self.assertIn('kaplan_meier_plot', data)

    def test_get_survival_invalid_method(self):
        response = self.client.get(reverse('get_survival'))
        self.assertEqual(response.status_code, 405)

    def test_get_survival_invalid_json(self):
        response = self.client.post(
            reverse('get_survival'),
            data='invalid json',
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
    
    def test_get_survival_empty_fields(self):
        empty_data = {
            "time_to_event": [],
            "event_status": []
        }
        response = self.client.post(
            reverse('get_survival'),
            data=json.dumps(empty_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('warning', json.loads(response.content))

    def test_get_survival_too_few_data_warning(self):
        few_data = {
            "time_to_event": [5],
            "event_status": [1]
        }
        response = self.client.post(
            reverse('get_survival'),
            data=json.dumps(few_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('warning', json.loads(response.content))
