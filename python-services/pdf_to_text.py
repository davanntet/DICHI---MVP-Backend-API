from pdf2image import convert_from_path
import google.generativeai as genai
import io,base64
import os
from dotenv import load_dotenv

class PDF2Text():
    is_instance = None
    def __new__(cls, *args, **kwargs):
        if cls.is_instance is None:
            cls.is_instance = super(PDF2Text, cls).__new__(cls)
        return cls.is_instance
    
    def __init__(self,prompt = "Extract text from [images], response to me like [tesseract] output. don't translate text, don't write your instruction in reponse", input_batches = 5):
        load_dotenv()
        self.poppler_path = os.environ.get('POPPLER_PATH')
        api_key = os.environ.get('API_KEY')
        model_id = os.environ.get('MODEL_ID')
        self.prompt = prompt
        self.input_batches = input_batches
        self.generation_config = {
            "temperature": 1,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192,
            "response_mime_type": "text/plain",
        }
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_id, generation_config=self.generation_config)


    def pdf_to_images(self, pdf_path):
        images = convert_from_path(pdf_path, poppler_path=self.poppler_path, dpi=300)
        return images
    
    def repare_input(self, images):
        list_of_images = []
        for image in images:
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='JPEG')
            img_byte_arr = img_byte_arr.getvalue()
            list_of_images.append({'mime_type':'image/jpeg', 'data': base64.b64encode(img_byte_arr).decode('utf-8')})
        
        len_imgs = len(list_of_images)
        num_batches = float(len_imgs)/float(self.input_batches)
        
        if num_batches == int(num_batches):
            num_batches = int(num_batches)
        else:
            num_batches = int(num_batches) + 1
        
        batch_images = []
        for i in range(num_batches):
            batch_img = []
            for j in range(self.input_batches):
                if len(batch_img) == self.input_batches or (i*self.input_batches + j) == len_imgs:
                    break
                batch_img.append(list_of_images[i*self.input_batches + j])
            batch_images.append(batch_img)
        return batch_images
    
    def extract_text(self, batch_images):
        results = []
        for batch in batch_images:
            batch = batch + [self.prompt]
            result = self.model.generate_content(batch)
            results.append(result.text)
        return results
    
    def pdf_to_text(self, pdf_path):
        images = self.pdf_to_images(pdf_path)
        batch_images = self.repare_input(images)
        results = self.extract_text(batch_images)
        return results