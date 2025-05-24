from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import openai
import matplotlib
matplotlib.use('Agg')  
import json
import statistics
from scipy import stats
from view.utils import ask_openai, parse_data
from view.distributions import kaplan_meier_to_dict
from view.descriptive_stats import process_statistics
from view.llm_handlers import generate_message, handle_predictions
from view.helper import evaluate_all_distributions, find_best_distribution, generate_visualizations, calculate_survival_metrics, generate_interpretation


# konfigurasi OpenAI API key
openai.api_key = settings.OPENAI_API_KEY

@csrf_exempt
def get_survival(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    try:
        data = json.loads(request.body)
        
        # Parse and clean data
        cleaned_time_to_event, cleaned_event_status = parse_data(data)

        # Generate message for OpenAI
        try:
            openai_message = generate_message(cleaned_time_to_event, cleaned_event_status, statistics.mean(cleaned_time_to_event), statistics.stdev(cleaned_time_to_event),stats.skew(cleaned_time_to_event), stats.kurtosis(cleaned_time_to_event))
        except ValueError as e:
            return JsonResponse({'warning': str(e)}, status=200)

        # Get predicted distribution from OpenAI
        predicted_distribution = ask_openai(openai_message)

        # Handle predictions and calculate metrics
        prediction_results = handle_predictions(
            cleaned_time_to_event, 
            cleaned_event_status, 
            predicted_distribution
        )
        result_message, aic, bic, params, goodness_of_fit = prediction_results

        # Evaluate all distributions
        distributions = ["weibull", "exponential", "lognormal", "gamma", "loglogistic", "pareto"]
        all_results = evaluate_all_distributions(
            cleaned_time_to_event,
            cleaned_event_status,
            distributions
        )

        # Find best distribution based on AIC
        best_dist, _ = find_best_distribution(all_results)
        best_params = all_results[best_dist]['params'] if best_dist else params

        # Generate visualizations
        visualization_data = generate_visualizations(
            cleaned_time_to_event,
            cleaned_event_status,
            best_dist,
            best_params
        )

        # Calculate Kaplan-Meier and median survival
        kaplan_meier_data = calculate_survival_metrics(
            cleaned_time_to_event,
            cleaned_event_status
        )
        kaplan_meier = kaplan_meier_data['kaplan_meier']
        median_survival = kaplan_meier_data['median_survival']

        # Generate interpretation
        interpretation = generate_interpretation(
            kaplan_meier,
            best_dist,
            best_params,
            median_survival,
            goodness_of_fit
        )

        # Prepare response
        response = {
            'predicted_distribution': result_message,
            'best_distribution': best_dist,
            'aic': aic,
            'bic': bic,
            'params': params,
            'best_params': best_params,
            'hasil_uji_goodness_of_fit': goodness_of_fit,
            'kaplan_meier_plot': visualization_data['kaplan_meier_plot'],
            'distribusi_plot': visualization_data['distribusi_plot'],
            'hazard_plot': visualization_data['hazard_plot'],
            'survival_plot': visualization_data['survival_plot'],
            'survival_function': visualization_data['survival_function'],
            'all_distributions_results': all_results,
            'kaplan_meier': kaplan_meier_to_dict(kaplan_meier) if kaplan_meier else None,
            'median_survival': median_survival,
            'interpretation': interpretation
        }
        
        return JsonResponse(response)

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON input'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# view untuk menangani permintaan statistik
@csrf_exempt
def get_statistics(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            variable = data.get('variable')
            data_values = data.get('data')
            is_numeric = data.get('isNumeric', True)

            if not variable or not data_values:
                return JsonResponse({'error': 'Missing required fields'}, status=400)

            # pastikan data yang dikirim adalah angka jika is_numeric True, jika tidak maka anggap string
            if is_numeric:
                data_values = [float(value) for value in data_values if value is not None]
            else:
                # data string tidak perlu dikonversi
                data_values = [str(value) for value in data_values if value is not None]

            # proses statistik
            stats_result = process_statistics(data_values, is_numeric)

            return JsonResponse(stats_result)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON format'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)


def index_views(request):
    return render(request, "index.html")

def about_views(request):
    return render(request, "about.html")


def usage_views(request):
    return render(request, "usage.html")


def statistic_views(request):
    return render(request, "statistic.html")