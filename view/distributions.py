import numpy as np
from scipy.stats import weibull_min, expon, lognorm, gamma, pareto, fisk
from scipy.optimize import minimize
from scipy.stats import kstest
from lifelines import KaplanMeierFitter

def calculate_aic(time_to_event, distribution, event_status=None):
    """Calculate AIC for all distributions with robust error handling."""
    if len(time_to_event) == 0:
        raise ValueError("Time-to-event data cannot be empty.")
    
    time_to_event = np.array(time_to_event)
    n = len(time_to_event)  # Sample size for BIC calculation
    
    if not np.all(time_to_event > 0):
        raise ValueError("All time-to-event values must be positive")
    
    if event_status is not None:
        event_status = np.array(event_status)
        if len(time_to_event) != len(event_status):
            raise ValueError("Time-to-event and event-status must have same length")
        if not np.all(np.isin(event_status, [0, 1])):
            raise ValueError("Event status must be 0 (censored) or 1 (event)")

    try:
        # Special handling for Pareto distribution
        if distribution == "pareto":
            if event_status is None:
                # MLE for complete data
                xm = np.min(time_to_event)
                alpha = len(time_to_event) / np.sum(np.log(time_to_event/xm))
            else:
                # MLE for censored data
                xm = np.min(time_to_event)
                alpha = np.sum(event_status) / np.sum(event_status * np.log(time_to_event/xm))
            
            params = (alpha, xm)
            log_likelihood = pareto_log_likelihood(time_to_event, params, event_status)
        else:
            # For other distributions
            params, log_likelihood = fit_distribution(time_to_event, distribution, event_status)
        
        k = len(params)
        aic = 2 * k - 2 * log_likelihood
        bic = k * np.log(n) - 2 * log_likelihood
        
        return aic,bic, params
    
    except Exception as e:
        raise ValueError(f"Error calculating AIC/BIC for {distribution}: {str(e)}")


def fit_distribution(time_to_event, distribution, event_status=None):
    """Fit distribution parameters with enhanced stability for all distributions."""
    time_to_event = np.array(time_to_event)
    mean_t = np.mean(time_to_event)
    std_t = np.std(time_to_event)
    
    # Distribution-specific configurations
    dist_config = {
        "weibull": {
            "initial_guess": [1.5, mean_t],
            "bounds": [(0.1, 20), (0.1, None)],
            "fit_func": weibull_log_likelihood
        },
        "gamma": {
            "initial_guess": [1.0, mean_t],
            "bounds": [(0.1, 20), (0.1, None)],
            "fit_func": gamma_log_likelihood
        },
        "lognormal": {
            "initial_guess": [max(0.1, std_t/mean_t), mean_t],
            "bounds": [(0.01, 5), (0.1, None)],
            "fit_func": lognormal_log_likelihood
        },
        "loglogistic": {
            "initial_guess": [1.5, mean_t],
            "bounds": [(0.1, 20), (0.1, None)],
            "fit_func": loglogistic_log_likelihood
        },
        "exponential": {
            "initial_guess": [mean_t],
            "bounds": [(0.1, None)],
            "fit_func": exponential_log_likelihood
        }
    }
    
    if distribution not in dist_config:
        raise ValueError(f"Unsupported distribution: {distribution}")
    
    config = dist_config[distribution]
    
    def neg_log_likelihood(params):
        try:
            ll = config["fit_func"](time_to_event, params, event_status)
            return -ll if np.isfinite(ll) else 1e10
        except Exception:
            return 1e10
    
    try:
        result = minimize(neg_log_likelihood, 
                         config["initial_guess"],
                         bounds=config["bounds"],
                         method='L-BFGS-B',
                         options={'maxiter': 1000, 'ftol': 1e-8})
        
        if not result.success:
            raise RuntimeError(f"Optimization failed: {result.message}")
        
        params = tuple(result.x)
        if any(not np.isfinite(p) for p in params):
            raise RuntimeError("Invalid parameter values obtained")
        
        return params, -result.fun
    
    except Exception as e:
        raise RuntimeError(f"Failed to fit {distribution} distribution: {str(e)}")

# Specific log-likelihood functions for each distribution
def lognormal_log_likelihood(time_to_event, params, event_status=None):
    """Log-likelihood for lognormal distribution."""
    s, scale = params
    if event_status is None:
        return np.sum(lognorm.logpdf(time_to_event, s, scale=scale))
    else:
        logpdf = lognorm.logpdf(time_to_event, s, scale=scale)
        logsf = lognorm.logsf(time_to_event, s, scale=scale)
        return np.sum(event_status * logpdf + (1 - event_status) * logsf)

def loglogistic_log_likelihood(time_to_event, params, event_status=None):
    """Log-likelihood for loglogistic (fisk) distribution."""
    c, scale = params
    if event_status is None:
        return np.sum(fisk.logpdf(time_to_event, c, scale=scale))
    else:
        logpdf = fisk.logpdf(time_to_event, c, scale=scale)
        logsf = fisk.logsf(time_to_event, c, scale=scale)
        return np.sum(event_status * logpdf + (1 - event_status) * logsf)

def pareto_log_likelihood(time_to_event, params, event_status=None):
    """Log-likelihood for Pareto distribution with proper handling."""
    alpha, xm = params
    if xm <= 0 or alpha <= 0:
        return -np.inf
    
    # Check all data points are >= xm
    if np.any(time_to_event < xm):
        return -np.inf
    
    if event_status is None:
        if alpha <= 1e-10:  # Prevent division by zero
            return -np.inf
        n = len(time_to_event)
        return n * np.log(alpha) + n * alpha * np.log(xm) - (alpha + 1) * np.sum(np.log(time_to_event))
    else:
        log_terms = np.where(event_status == 1,
                            np.log(alpha) + alpha * np.log(xm) - (alpha + 1) * np.log(time_to_event),
                            alpha * np.log(xm) - alpha * np.log(time_to_event))
        return np.sum(log_terms)

def exponential_log_likelihood(time_to_event, params, event_status=None):
    """Log-likelihood for exponential distribution."""
    scale = params[0]
    if event_status is None:
        return np.sum(expon.logpdf(time_to_event, scale=scale))
    else:
        logpdf = expon.logpdf(time_to_event, scale=scale)
        logsf = expon.logsf(time_to_event, scale=scale)
        return np.sum(event_status * logpdf + (1 - event_status) * logsf)

def weibull_log_likelihood(time_to_event, params, event_status=None):
    """Log-likelihood for weibull distribution."""
    shape, scale = params
    if event_status is None:
        return np.sum(weibull_min.logpdf(time_to_event, shape, scale=scale))
    else:
        logpdf = weibull_min.logpdf(time_to_event, shape, scale=scale)
        logsf = weibull_min.logsf(time_to_event, shape, scale=scale)
        return np.sum(event_status * logpdf + (1 - event_status) * logsf)

def gamma_log_likelihood(time_to_event, params, event_status=None):
    """Log-likelihood for gamma distribution."""
    shape, scale = params
    if event_status is None:
        return np.sum(gamma.logpdf(time_to_event, shape, scale=scale))
    else:
        logpdf = gamma.logpdf(time_to_event, shape, scale=scale)
        logsf = gamma.logsf(time_to_event, shape, scale=scale)
        return np.sum(event_status * logpdf + (1 - event_status) * logsf)

def evaluate_goodness_of_fit(time_to_event, distribution, params):
    """Evaluate goodness of fit using Kolmogorov-Smirnov test."""
    if distribution == "weibull":
        cdf_func = lambda x: weibull_min.cdf(x, *params)
    elif distribution == "exponential":
        cdf_func = lambda x: expon.cdf(x, *params)
    elif distribution == "lognormal":
        cdf_func = lambda x: lognorm.cdf(x, *params)
    elif distribution == "gamma":
        cdf_func = lambda x: gamma.cdf(x, *params)
    elif distribution == "loglogistic":
        cdf_func = lambda x: fisk.cdf(x, *params)
    elif distribution == "pareto":
        cdf_func = lambda x: pareto.cdf(x, *params)
    else:
        raise ValueError("Unsupported distribution")
    
    ks_stat, p_value = kstest(time_to_event, cdf_func)
    return ks_stat, p_value

def calculate_kaplan_meier(time_to_event, event_status=None):
    """Calculate Kaplan-Meier survival estimate with confidence intervals."""
    if not time_to_event:
        return None

    time_to_event = np.array(time_to_event)
    if event_status is None:
        event_status = np.ones_like(time_to_event)
    
    # Initialize with 95% confidence interval
    kmf = KaplanMeierFitter(alpha=0.05)  # 95% CI
    kmf.fit(time_to_event, event_observed=event_status)
    
    # Force confidence interval calculation if not automatically computed
    if kmf.confidence_interval_ is None:
        kmf.confidence_interval_ = kmf._compute_confidence_interval()
    
    return kmf

def kaplan_meier_to_dict(kmf):
    return {
        'timeline': kmf.timeline.tolist(),
        'survival_function': kmf.survival_function_.values.flatten().tolist(),
        'confidence_interval': kmf.confidence_interval_.values.flatten().tolist() 
        if hasattr(kmf, 'confidence_interval_') else None
    }

def calculate_median_survival(kmf):
    """Calculate median survival time from Kaplan-Meier fit."""
    if kmf is None:
        return None
    return kmf.median_survival_time_
