import statistics
from scipy import stats
from .plotting import create_boxplot_base64, create_histogram_base64, create_barchart_base64

def calculate_numeric_statistics(data_values):
    if not data_values:
        return None
    return {
        "mean": round(statistics.mean(data_values), 2),
        "median": round(statistics.median(data_values), 2),
        "mode": round(statistics.mode(data_values), 2) if len(set(data_values)) != len(data_values) else None,
        "std": round(statistics.stdev(data_values), 2) if len(data_values) > 1 else None,
        "kurtosis": round(stats.kurtosis(data_values), 2) if len(data_values) > 3 else None,
        "skewness": round(stats.skew(data_values), 2) if len(data_values) > 2 else None,
        "min": round(min(data_values), 2),
        "max": round(max(data_values), 2),
        "range": round(max(data_values) - min(data_values), 2),
        "sum": round(sum(data_values), 2),
        "count": len(data_values),
        "uniqueCount": len(set(data_values)),
    }


# fungsi menghitung statistik untuk data kategori
def calculate_categorical_statistics(data_values):
    if not data_values:
        return None
    category_counts = {category: data_values.count(category) for category in set(data_values)}
    return {
        "mode": max(category_counts, key=category_counts.get),
        "uniqueCount": len(category_counts),
        "categoryCount": category_counts
    }

def process_statistics(data_values, is_numeric):
    if is_numeric:
        return {
            "type": "Numeric",
            **calculate_numeric_statistics(data_values),
            "boxplot": create_boxplot_base64(data_values),
            "histogram": create_histogram_base64(data_values),
            "barchart": None
        }
    else:
        return {
            "type": "Categorical",
             **calculate_categorical_statistics(data_values),
            "boxplot": None,  # Boxplot tidak relevan untuk data kategorikal
            "barchart": create_barchart_base64(data_values)
        }


