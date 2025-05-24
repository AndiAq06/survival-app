from .utils import ask_openai_gpt
from .distributions import calculate_aic, evaluate_goodness_of_fit, calculate_kaplan_meier, calculate_median_survival
from .plotting import create_hazard_plot_base64, create_kaplan_meier_plot_base64, create_survival_comparison_plot, create_survival_plot_base64

def evaluate_all_distributions(time_to_event, event_status, distributions):
    """Evaluate all distributions and return their metrics."""
    results = {}
    for dist in distributions:
        try:
            if not time_to_event:
                results[dist] = {'error': 'Data kosong, tidak dapat menghitung AIC atau KS test.'}
                continue

            # Calculate AIC/BIC
            if not event_status:
                aic_dist, bic_dist, params_dist = calculate_aic(time_to_event, dist)
            else:
                aic_dist, bic_dist, params_dist = calculate_aic(time_to_event, dist, event_status)

            # Calculate goodness-of-fit
            ks_stat_dist, p_value_dist = evaluate_goodness_of_fit(time_to_event, dist, params_dist)
            goodness_of_fit = f"KS-statistic = {ks_stat_dist:.4f}, p-value = {p_value_dist:.4f}"

            results[dist] = {
                'aic': aic_dist,
                'bic': bic_dist,
                'params': params_dist,
                'ks_stat': ks_stat_dist,
                'p_value': p_value_dist,
                'goodness_of_fit': goodness_of_fit
            }

        except Exception as e:
            results[dist] = {'aic': None, 'error': str(e)}

    return results


def find_best_distribution(all_results):
    """Find the distribution with the lowest AIC."""
    best_dist = None
    min_aic = float('inf')
    for dist, result in all_results.items():
        if result.get('aic') is not None and result['aic'] < min_aic:
            min_aic = result['aic']
            best_dist = dist
    return best_dist, min_aic


def generate_visualizations(time_to_event, event_status, best_dist, best_params):
    """Generate all visualization plots."""
    if not time_to_event:
        return {
            'kaplan_meier_plot': None,
            'distribusi_plot': None,
            'hazard_plot': None,
            'survival_plot': None,
            'survival_function': None
        }

    if not event_status:
        hazard_plot = create_hazard_plot_base64(time_to_event, best_dist, best_params)
        kaplan_meier_plot = create_kaplan_meier_plot_base64(time_to_event, best_dist, best_params)
        survival_plot = create_survival_comparison_plot(time_to_event, best_dist, best_params)
        survival_function = create_survival_plot_base64(time_to_event, best_dist, best_params)
    else:
        hazard_plot = create_hazard_plot_base64(time_to_event, best_dist, best_params, event_status)
        kaplan_meier_plot = create_kaplan_meier_plot_base64(time_to_event, best_dist, best_params, event_status)
        survival_plot = create_survival_comparison_plot(time_to_event, best_dist, best_params, event_status)
        survival_function = create_survival_plot_base64(time_to_event, best_dist, best_params, event_status)

    return {
        'kaplan_meier_plot': kaplan_meier_plot,
        'distribusi_plot': None,  # Original code had this as None
        'hazard_plot': hazard_plot,
        'survival_plot': survival_plot,
        'survival_function': survival_function
    }


def calculate_survival_metrics(time_to_event, event_status):
    """Calculate Kaplan-Meier and median survival."""
    if not time_to_event:
        return {'kaplan_meier': None, 'median_survival': None}

    if not event_status:
        kaplan_meier = calculate_kaplan_meier(time_to_event)
    else:
        kaplan_meier = calculate_kaplan_meier(time_to_event, event_status)

    median_survival = calculate_median_survival(kaplan_meier)
    return {'kaplan_meier': kaplan_meier, 'median_survival': median_survival}


def generate_interpretation(kaplan_meier, best_dist, best_params, median_survival, goodness_of_fit):
    """Generate interpretation using LLM."""
    if not kaplan_meier:
        return None

    timeline = kaplan_meier.timeline
    survival_prob = kaplan_meier.survival_function_.values.flatten()
    
    km_points = "\n".join([f"- Waktu {time:.1f}: Survival {prob:.2%}" 
                         for time, prob in zip(timeline, survival_prob)])
    
    interpretation_message = (
        f"Data Survival Aktual:\n{km_points}\n\n"
        f"Distribusi terbaik: {best_dist}\n"
        f"Parameter: {best_params}\n"
        f"Median survival: {median_survival}\n"
        f"Goodness-of-fit: {goodness_of_fit}\n\n"
        "Buat interpretasi dengan:\n"
        "1. ANALISIS DATA AKTUAL (gunakan angka di atas):\n"
        "   - Jelaskan tren survival berdasarkan titik-titik kunci\n"
        "   - Identifikasi 3 periode dengan penurunan terbesar\n"
        "   - Hitung persentase penurunan antar titik penting\n\n"
        "2. INTERPRETASI MODEL:\n"
        "   - Jelaskan arti parameter {best_params}\n"
        "   - Bandingkan median model dengan data aktual\n\n"
    )

    return ask_openai_gpt(interpretation_message)