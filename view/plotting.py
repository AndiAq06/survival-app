import matplotlib.pyplot as plt
import numpy as np
from .constants import COLORS, PLOT_STYLE, FIGURE_FIGSIZE, UPPER_RIGHT, KAPLAN_MEIER, SURVIVAL_PROBABILITY
from .utils import plot_to_base64
from lifelines import KaplanMeierFitter
from scipy.stats import weibull_min, expon, lognorm, gamma, pareto, fisk

def create_hazard_plot_base64(time_to_event, distribution, params, event_status=None):
    """Create hazard function plot with improved styling and formatting."""
    if not time_to_event:
        return None

    # Use matplotlib's default style instead of seaborn
    with plt.style.context('default'):
        plt.rcParams.update(PLOT_STYLE)
        fig, ax = plt.subplots(figsize=PLOT_STYLE[FIGURE_FIGSIZE])
        fig.patch.set_facecolor('white')
        
        time_to_event = np.array(time_to_event)
        if event_status is None:
            event_status = np.ones_like(time_to_event)
        else:
            event_status = np.array(event_status)
        
        filtered_time_to_event = time_to_event[event_status == 1]
        
        if not filtered_time_to_event.size:
            return None
        
        # Define hazard function and parameter text
        if distribution == "weibull":
            hazard_func = lambda t: weibull_min.pdf(t, params[0], scale=params[1]) / weibull_min.sf(t, params[0], scale=params[1])
            param_text = f"Weibull Parameters:\nShape (c): {params[0]:.3f}\nScale (λ): {params[1]:.3f}"
        elif distribution == "exponential":
            hazard_func = lambda t: expon.pdf(t, scale=params[0]) / expon.sf(t, scale=params[0])
            param_text = f"Exponential Parameter:\nRate (λ): {params[0]:.3f}"
        elif distribution == "lognormal":
            hazard_func = lambda t: lognorm.pdf(t, params[0], scale=params[1]) / lognorm.sf(t, params[0], scale=params[1])
            param_text = f"Lognormal Parameters:\nShape (σ): {params[0]:.3f}\nScale (μ): {params[1]:.3f}"
        elif distribution == "gamma":
            hazard_func = lambda t: gamma.pdf(t, params[0], scale=params[1]) / gamma.sf(t, params[0], scale=params[1])
            param_text = f"Gamma Parameters:\nShape (k): {params[0]:.3f}\nScale (θ): {params[1]:.3f}"
        elif distribution == "loglogistic":
            hazard_func = lambda t: fisk.pdf(t, params[0], scale=params[1]) / fisk.sf(t, params[0], scale=params[1])
            param_text = f"Log-Logistic Parameters:\nShape (c): {params[0]:.3f}\nScale (λ): {params[1]:.3f}"
        elif distribution == "pareto":
            hazard_func = lambda t: pareto.pdf(t, params[0], scale=params[1]) / pareto.sf(t, params[0], scale=params[1])
            param_text = f"Pareto Parameters:\nShape (α): {params[0]:.3f}\nScale (xm): {params[1]:.3f}"
        else:
            raise ValueError(f"Unsupported distribution: {distribution}")
        
        # Calculate hazard values
        t = np.linspace(max(0.01, min(filtered_time_to_event)), max(filtered_time_to_event), 200)
        h = hazard_func(t)
        
        # Plot hazard function
        ax.plot(t, h, color=COLORS['accent'], label='Hazard Function')
        ax.fill_between(t, h, color=COLORS['accent'], alpha=0.1)
        
        # Formatting
        ax.set_title(f"Hazard Function ({distribution.capitalize()})", pad=20)
        ax.set_xlabel("Time", labelpad=10)
        ax.set_ylabel("Hazard Rate", labelpad=10)
        ax.grid(True, linestyle='--', alpha=0.3)
        
        # Add parameter box
        ax.text(0.95, 0.95, param_text, transform=ax.transAxes, 
                fontsize=10, verticalalignment='top', horizontalalignment='right',
                bbox=dict(boxstyle='round', facecolor='white', alpha=0.8, edgecolor='gray'))
        
        return plot_to_base64(fig)

def create_kaplan_meier_plot_base64(time_to_event, distribution, _ , event_status=None):
    """Create Kaplan-Meier plot with improved styling and confidence intervals."""
    if not time_to_event:
        return None

    # Use matplotlib's default style instead of seaborn
    with plt.style.context('default'):
        plt.rcParams.update(PLOT_STYLE)
        fig, ax = plt.subplots(figsize=PLOT_STYLE[FIGURE_FIGSIZE])
        fig.patch.set_facecolor('white')
        
        time_to_event = np.array(time_to_event)
        if event_status is None:
            event_status = np.ones_like(time_to_event)
        else:
            event_status = np.array(event_status)
        
        # Plot Kaplan-Meier curve
        kmf = KaplanMeierFitter()
        kmf.fit(time_to_event, event_observed=event_status, label=KAPLAN_MEIER)
        kmf.plot(ax=ax, ci_show=True, color=COLORS['primary'], linewidth=2.5)
        
        # Formatting
        ax.set_title(f"Kaplan-Meier Survival Estimate ({distribution.capitalize()})", pad=20)
        ax.set_xlabel("Time", labelpad=10)
        ax.set_ylabel(SURVIVAL_PROBABILITY, labelpad=10)
        ax.grid(True, linestyle='--', alpha=0.3)
        ax.legend(loc=UPPER_RIGHT)
        
        # Add at-risk counts below the plot
        ax.text(0.99, -0.15, f"N = {len(time_to_event)} | Events = {sum(event_status)}", 
                transform=ax.transAxes, ha='right', va='top', fontsize=9)
        
        return plot_to_base64(fig)

def create_survival_comparison_plot(time_to_event, distribution, params, event_status=None):
    if not time_to_event:
        return None

    # Use matplotlib's default style instead of seaborn
    with plt.style.context('default'):
        plt.rcParams.update(PLOT_STYLE)
        fig, ax = plt.subplots(figsize=PLOT_STYLE[FIGURE_FIGSIZE])
        fig.patch.set_facecolor('white')
        
        time_to_event = np.array(time_to_event)
        if event_status is None:
            event_status = np.ones_like(time_to_event)
        else:
            event_status = np.array(event_status)

        # Calculate Kaplan-Meier estimate
        kmf = KaplanMeierFitter()
        kmf.fit(time_to_event, event_observed=event_status, label= KAPLAN_MEIER)
        
        # Plot Kaplan-Meier
        kmf.plot(ax=ax, ci_show=False, color=COLORS['primary'], 
                linewidth=2.5)

        # Define theoretical survival function
        t = np.linspace(0, max(time_to_event)*1.1, 200)
        if distribution == "weibull":
            survival_func = weibull_min.sf(t, params[0], scale=params[1])
            dist_label = "Weibull Survival"
        elif distribution == "exponential":
            survival_func = expon.sf(t, scale=params[0])
            dist_label = "Exponential Survival"
        elif distribution == "lognormal":
            survival_func = lognorm.sf(t, params[0], scale=params[1])
            dist_label = "Lognormal Survival"
        elif distribution == "gamma":
            survival_func = gamma.sf(t, params[0], scale=params[1])
            dist_label = "Gamma Survival"
        elif distribution == "loglogistic":
            survival_func = fisk.sf(t, params[0], scale=params[1])
            dist_label = "Log-Logistic Survival"
        elif distribution == "pareto":
            survival_func = pareto.sf(t, params[0], scale=params[1])
            dist_label = "Pareto Survival"
        else:
            raise ValueError(f"Unsupported distribution: {distribution}")

        # Plot theoretical survival
        ax.plot(t, survival_func, color=COLORS['accent'], 
               linewidth=2.5, linestyle='--', label=dist_label)

        # Formatting
        ax.set_title(f"Survival Function Comparison\n({distribution.capitalize()})", pad=20)
        ax.set_xlabel("Time", labelpad=10)
        ax.set_ylabel(SURVIVAL_PROBABILITY, labelpad=10)
        ax.grid(True, linestyle='--', alpha=0.3)
        ax.legend(loc=UPPER_RIGHT)
        
        # Add sample information
        n_events = sum(event_status) if event_status is not None else len(time_to_event)
        ax.text(0.99, -0.15, 
               f"N = {len(time_to_event)} | Events = {n_events}",
               transform=ax.transAxes, ha='right', va='top', fontsize=9)

        return plot_to_base64(fig)


def create_survival_plot_base64(time_to_event, distribution, params, event_status=None):
    """Create survival function plot that handles both cases (with/without event_status)."""
    if not time_to_event:
        return None

    # Use matplotlib's default style instead of seaborn
    with plt.style.context('default'):
        plt.rcParams.update(PLOT_STYLE)
        fig, ax = plt.subplots(figsize=PLOT_STYLE[FIGURE_FIGSIZE])
        fig.patch.set_facecolor('white')
        
        time_to_event = np.array(time_to_event)
        if event_status is None:
            # If no event_status provided, treat all as events
            event_status = np.ones_like(time_to_event)
            km_label = 'Empirical Survival'
        else:
            event_status = np.array(event_status)
            km_label = KAPLAN_MEIER
        
        # Define theoretical survival function
        t = np.linspace(0, max(time_to_event)*1.1, 200)
        if distribution == "weibull":
            survival_func = weibull_min.sf(t, params[0], scale=params[1])
            dist_label = "Weibull Survival"
            param_text = f"Weibull Parameters:\nShape (c): {params[0]:.3f}\nScale (λ): {params[1]:.3f}"
        elif distribution == "exponential":
            survival_func = expon.sf(t, scale=params[0])
            dist_label = "Exponential Survival"
            param_text = f"Exponential Parameter:\nRate (λ): {params[0]:.3f}"
        elif distribution == "lognormal":
            survival_func = lognorm.sf(t, params[0], scale=params[1])
            dist_label = "Lognormal Survival"
            param_text = f"Lognormal Parameters:\nShape (σ): {params[0]:.3f}\nScale (μ): {params[1]:.3f}"
        elif distribution == "gamma":
            survival_func = gamma.sf(t, params[0], scale=params[1])
            dist_label = "Gamma Survival"
            param_text = f"Gamma Parameters:\nShape (k): {params[0]:.3f}\nScale (θ): {params[1]:.3f}"
        elif distribution == "loglogistic":
            survival_func = fisk.sf(t, params[0], scale=params[1])
            dist_label = "Log-Logistic Survival"
            param_text = f"Log-Logistic Parameters:\nShape (c): {params[0]:.3f}\nScale (λ): {params[1]:.3f}"
        elif distribution == "pareto":
            survival_func = pareto.sf(t, params[0], scale=params[1])
            dist_label = "Pareto Survival"
            param_text = f"Pareto Parameters:\nShape (α): {params[0]:.3f}\nScale (xm): {params[1]:.3f}"
        else:
            raise ValueError(f"Unsupported distribution: {distribution}")
        
        # Plot theoretical survival
        ax.plot(t, survival_func, color=COLORS['accent'], 
               linewidth=2.5, linestyle='--', label=dist_label)
        
        # Plot empirical/Kaplan-Meier survival
        kmf = KaplanMeierFitter()
        kmf.fit(time_to_event, event_observed=event_status, label=km_label)
        
        if event_status is None or np.all(event_status == 1):
            # Simple step plot if all events are observed
            kmf.plot(ax=ax, ci_show=False, color=COLORS['primary'], linewidth=2.5)
        else:
            # With confidence intervals if there's censoring
            kmf.plot(ax=ax, ci_show=True, color=COLORS['primary'], linewidth=2.5)
        
        # Formatting
        ax.set_title(f"Survival Function ({distribution.capitalize()})", pad=20)
        ax.set_xlabel("Time", labelpad=10)
        ax.set_ylabel(SURVIVAL_PROBABILITY, labelpad=10)
        ax.grid(True, linestyle='--', alpha=0.3)
        ax.legend(loc=UPPER_RIGHT)
        
        # Add parameter box
        ax.text(0.95, 0.95, param_text, transform=ax.transAxes, 
                fontsize=10, verticalalignment='top', horizontalalignment='right',
                bbox=dict(boxstyle='round', facecolor='white', alpha=0.8, edgecolor='gray'))
        
        # Add sample information
        n_events = sum(event_status) if event_status is not None else len(time_to_event)
        ax.text(0.99, -0.15, 
               f"N = {len(time_to_event)} | Events = {n_events}",
               transform=ax.transAxes, ha='right', va='top', fontsize=9)
        
        return plot_to_base64(fig)


# fungsi untuk membuat boxplot
def create_boxplot_base64(data_values):
    """Create styled boxplot with consistent formatting."""
    with plt.style.context('default'):
        plt.rcParams.update(PLOT_STYLE)
        fig, ax = plt.subplots(figsize=PLOT_STYLE[FIGURE_FIGSIZE])
        fig.patch.set_facecolor('white')
        
        # Create boxplot with consistent styling
        _ = ax.boxplot(data_values, 
                           patch_artist=True,
                           boxprops=dict(facecolor=COLORS['primary'], 
                                        color=COLORS['primary'],
                                        linewidth=1.5),
                           whiskerprops=dict(color=COLORS['text'], 
                                           linewidth=1.5),
                           capprops=dict(color=COLORS['text'], 
                                       linewidth=1.5),
                           flierprops=dict(markerfacecolor=COLORS['primary'],
                                         marker='o',
                                         markersize=6,
                                         alpha=0.6),
                           medianprops=dict(color=COLORS['accent'],
                                          linewidth=2))
        
        # Formatting
        ax.set_title('Distribution Boxplot', pad=20)
        ax.set_ylabel('Values', labelpad=10)
        ax.grid(True, linestyle='--', alpha=0.3)
        
        # Remove unnecessary spines while keeping left and bottom
        for spine in ['top', 'right']:
            ax.spines[spine].set_visible(False)
            
        return plot_to_base64(fig)

def create_histogram_base64(data, bins=10):
    """Create styled histogram with consistent formatting."""
    with plt.style.context('default'):
        plt.rcParams.update(PLOT_STYLE)
        fig, ax = plt.subplots(figsize=PLOT_STYLE[FIGURE_FIGSIZE])
        fig.patch.set_facecolor('white')
        
        # Create histogram with consistent styling
        hist = ax.hist(data, bins=bins, 
                      color=COLORS['primary'],
                      edgecolor='white',
                      linewidth=1,
                      alpha=0.8)
        
        # Formatting
        ax.set_title("Value Distribution", pad=20)
        ax.set_xlabel("Value", labelpad=10)
        ax.set_ylabel("Frequency", labelpad=10)
        ax.grid(True, linestyle='--', alpha=0.3)
        
        # Ensure y-axis shows only integers
        ax.yaxis.set_major_locator(plt.MaxNLocator(integer=True))
        
        # Add frequency labels
        for rect in hist[2]:
            height = rect.get_height()
            if height > 0:
                ax.text(rect.get_x() + rect.get_width()/2, height + 0.5,
                       f'{int(height)}', 
                       ha='center', va='bottom',
                       fontsize=10, color=COLORS['text'])
        
        # Remove unnecessary spines
        for spine in ['top', 'right']:
            ax.spines[spine].set_visible(False)
            
        return plot_to_base64(fig)

def create_barchart_base64(data_values):
    """Create styled bar chart with consistent formatting."""
    with plt.style.context('default'):
        plt.rcParams.update(PLOT_STYLE)
        fig, ax = plt.subplots(figsize=PLOT_STYLE[FIGURE_FIGSIZE])
        fig.patch.set_facecolor('white')
        
        categories = list(set(data_values))
        counts = [data_values.count(category) for category in categories]
        
        # Create bar chart with consistent styling
        bars = ax.bar(categories, counts,
                     color=COLORS['primary'],
                     edgecolor='white',
                     linewidth=1,
                     width=0.6,
                     alpha=0.8)
        
        # Formatting
        ax.set_title("Category Distribution", pad=20)
        ax.set_xlabel('Category', labelpad=10)
        ax.set_ylabel('Count', labelpad=10)
        ax.grid(True, linestyle='--', alpha=0.3, axis='y')
        
        # Add count labels
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2, height + 0.5,
                   f'{int(height)}',
                   ha='center', va='bottom',
                   fontsize=10, color=COLORS['text'])
        
        # Ensure y-axis shows only integers
        ax.yaxis.set_major_locator(plt.MaxNLocator(integer=True))
        
        # Remove unnecessary spines
        for spine in ['top', 'right']:
            ax.spines[spine].set_visible(False)
            
        return plot_to_base64(fig)