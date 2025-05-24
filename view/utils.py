import base64
from io import BytesIO
import matplotlib.pyplot as plt
import numpy as np
from django.conf import settings
import openai

def plot_to_base64(fig):
    """Convert matplotlib figure to base64 encoded PNG."""
    buf = BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=120, facecolor='white')
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return img_base64

def ask_openai(message):
    try:
        response = openai.chat.completions.create(
            model='ft:gpt-4o-mini-2024-07-18:personal::BNRx1wcZ',  
            messages=[{'role': 'user', 'content': message}],
            temperature=0
        )
        answer = response.choices[0].message.content
        return answer

    except openai.OpenAIError as e:
        print(f"Error: {e}")
        return "An error occurred while processing your request."

def ask_openai_gpt(message):
    try:
        response = openai.chat.completions.create(
            model='gpt-4o-mini',  
            messages=[{'role': 'user', 'content': message}],#
            temperature=0
        )
        answer = response.choices[0].message.content
        return answer

    except openai.OpenAIError as e:
        print(f"Error: {e}")
        return "An error occurred while processing your request."
    
# Fungsi untuk membulatkan angka# Fungsi untuk membulatkan angka ke 2 desimal
def format_number(value):
    if isinstance(value, (int, float)):
        return round(value, 2)
    elif isinstance(value, list):  
        return [format_number(v) for v in value]
    return value  

# fungsi untuk melakukan parsing data
def parse_data(data):
    time_to_event = data.get('time_to_event', [])
    event_status = data.get('event_status', [])
    
    if not isinstance(time_to_event, list) or not isinstance(event_status, list):
        raise ValueError("'time_to_event' and 'event_status' must be lists.")

    # melakukan clean data
    cleaned_time_to_event = [float(x) for x in time_to_event if x is not None and x != ""]
    cleaned_event_status = [int(x) for x in event_status if x is not None and x != ""]
    
    return cleaned_time_to_event, cleaned_event_status

# Fungsi untuk mengubah ndarray menjadi list
def ndarray_to_list(arr):
    if isinstance(arr, np.ndarray):
        return [format_number(x) for x in arr.tolist()]
    return arr

def process_text_input(user_input):
    return user_input