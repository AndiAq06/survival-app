from .distributions import calculate_aic, evaluate_goodness_of_fit, evaluate_goodness_of_fit
import re


def generate_message(time_to_event, event_status, mean, std_dev,skewness, kurtosis):
    if time_to_event and event_status:
        return (
            f"Anda adalah ahli statistik khusus dalam analisis survival. Tugas Anda adalah mengidentifikasi distribusi probabilitas yang paling cocok untuk data survival yang diberikan. Distribusi kandidat yang perlu dianalisis meliputi: Exponential, Weibull, Gamma, Pareto, Log-Normal, dan Log-Logistic. Gunakan informasi berikut untuk penilaian: time_to_event, event_status, mean, standard deviation, skewness, kurtosis, dan parameter estimasi dari distribusi tertentu. Berikan hanya satu distribusi yang paling sesuai. time_to_event:[{time_to_event}], event_status: {event_status}, mean: {mean}, std_dev: {std_dev}, skewness: {skewness}, kurtosis {kurtosis}"

        )
    elif time_to_event:
        return (
            f"Anda adalah ahli statistik khusus dalam analisis survival. Tugas Anda adalah mengidentifikasi distribusi probabilitas yang paling cocok untuk data survival yang diberikan. Distribusi kandidat yang perlu dianalisis meliputi: Exponential, Weibull, Gamma, Pareto, Log-Normal, dan Log-Logistic. Gunakan informasi berikut untuk penilaian: time_to_event, event_status, mean, standard deviation, skewness, kurtosis, dan parameter estimasi dari distribusi tertentu. Berikan hanya satu distribusi yang paling sesuai. time_to_event:[{time_to_event}], mean: {mean}, std_dev: {std_dev}, skewness: {skewness}, kurtosis {kurtosis}"

        )
    elif event_status:
        return (
            f"Berikut adalah data status kejadian (event_status): {event_status}.\n"
            f"Namun data 'time_to_event' tidak tersedia, sehingga analisis distribusi tidak dapat dilakukan secara lengkap."
        )
    else:
        raise ValueError("Minimal salah satu dari time_to_event atau event_status harus tersedia.")



# fungsi untuk meng-handle prediksi dari openai
def handle_predictions(cleaned_time_to_event, cleaned_event_status, predicted_distribution):
    distribution_pattern = r"(weibull|exponential|lognormal|loglogistic|gamma|pareto)"
    match = re.search(distribution_pattern, predicted_distribution.lower())
    
    if not match:
        return "Tidak ditemukan distribusi spesifik dalam respons.", None, None, None, "Goodness-of-fit test not available"

    predicted_distribution = match.group(0).lower()
    result_message = predicted_distribution  # Pesan hasil distribusi
    aic, bic, params, hasil_uji_goodness_of_fit = None, None, None, "Goodness-of-fit test not available"

    try:
        if cleaned_time_to_event:
            # Hitung AIC, BIC, dan params
            if not cleaned_event_status:
                aic, bic, params = calculate_aic(cleaned_time_to_event, predicted_distribution)
            else:
                aic, bic, params = calculate_aic(cleaned_time_to_event, predicted_distribution, cleaned_event_status)
            
            # Jika params berhasil didapatkan, lakukan uji goodness-of-fit
            if params is not None:
                ks_stat, p_value = evaluate_goodness_of_fit(cleaned_time_to_event, predicted_distribution, params)
                hasil_uji_goodness_of_fit = f"Uji Kolmogorov-Smirnov: KS-statistic = {ks_stat:.4f}, p-value = {p_value:.4f}"
            else:
                hasil_uji_goodness_of_fit = "Goodness-of-fit test failed: Parameters not available"
    
    except Exception as e:
        # Jika terjadi error dalam perhitungan, kembalikan nilai default dengan pesan error
        error_msg = f"Error dalam pemrosesan: {str(e)}"
        return result_message, None, None, None, error_msg

    return result_message, aic, bic, params, hasil_uji_goodness_of_fit