import os
from dotenv import load_dotenv
from supabase import Client

class SupabaseAMK:
    _instance = None
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SupabaseAMK, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, 'initialized'):
            load_dotenv()
            self.bucket_name = os.environ.get('SUPABASE_BUCKET')
            self.supabase = Client(
                os.environ.get('SUPABASE_URL'),
                os.environ.get('SUPABASE_API_KEY')
            )
            self.initialized = True
            
    def upload_file(self, file_name):
        file_path = f"{os.environ.get('DATA_SOURCE_PATH')}/{file_name}"
        response = self.supabase.storage.from_(self.bucket_name).upload(file_name,file_path,{'upsert': 'true','content-type': "application/pdf"})
        return response
    
    def list_files(self):
        response = self.supabase.storage.from_(self.bucket_name).list()
        return response
    
    