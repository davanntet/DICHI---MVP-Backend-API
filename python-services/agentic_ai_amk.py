import google.generativeai as genai
import base64
import chromadb
from sentence_transformers import SentenceTransformer
import numpy as np
import os
from dotenv import load_dotenv
import langid

class AgenticAI:
    _instance = None
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AgenticAI, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, 'initialized'):
            load_dotenv()
            self.poppler_path = os.environ.get('POPPLER_PATH')
            api_key = os.environ.get('API_KEY')
            model_id = os.environ.get('MODEL_ID')
            self.data_source_path = os.environ.get('DATA_SOURCE_PATH')
            self.embedding_model = SentenceTransformer('sentence-transformers/paraphrase-multilingual-mpnet-base-v2')
            self.generation_config = {
                "temperature": 1,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 8192,
                "response_mime_type": "text/plain",
            }
            
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel(model_id, generation_config=self.generation_config)
            # self.prompt = """You are a helpful and informative bot that answers questions using text from the reference context included below.
            # Be sure to respond in a complete sentence, being comprehensive, including all relevant background information. Answer it in bullet point. Response answer in [Khmer] language and don't include your any instruction in [Response]

            # QUESTION: {}
            # """
            self.prompt = """You are a helpful and informative bot that answers questions using text from the reference context included below.
            Be sure to respond in a complete sentence, being comprehensive, including all relevant background information. Answer it in bullet point. Response answer in [Khmer] language and don't include your any instruction in [Response]. Include page number in your response also.

            QUESTION: {}
            """
            
            self.prompt_check_doc = """You are a grader assessing relevance of a retrieved document to a user question. \n 
            Here is the user question: {} \n
            If the document contains keyword(s) or semantic meaning related to the user question, grade it as relevant. \n
            Give a binary score 'yes' or 'no' score to indicate whether the document is relevant to the question."""
            
            chroma_client = chromadb.PersistentClient(os.environ.get('DATABASE_FOLDER'))
            self.chroma_db = chroma_client.get_or_create_collection(
                name=os.environ.get('DB_NAME'),
                metadata={
                    "hnsw:space": "cosine",
                    "hnsw:search_ef": 100
                }
            )
            self.initialized = True
        
    def load_file_local(self, file_name):
        file_path = f"{self.data_source_path}/{file_name}"
        try:
            with open(file_path, "rb") as doc_file:
                doc_data = base64.standard_b64encode(doc_file.read()).decode("utf-8")
            return doc_data
        except:
            print("File not found")
            return None

    def llm(self, input_prompt, question):
        related_docs = self.get_related_documents(question)
        if related_docs is None:
            return None
        responses = [(key,self.model.generate_content([{'mime_type': 'application/pdf', 'data': value}, input_prompt]).text) for key,value in related_docs.items()]
        return responses
    
    def ask_question(self, question):
        input_prompt = self.prompt.format(question)
        responses = self.llm(input_prompt, question)
        if responses is None:
            return [(None,"No related document found")]
        return responses

    def get_similar_documents(self, question):
        question_embedded = self.embedding_model.encode([question])
        similar_docs = self.chroma_db.query(query_embeddings = question_embedded, n_results=5)
        related_docs = np.unique([list(val.values())[0] for val in similar_docs['metadatas'][0]])
        return related_docs
    
    def check_document(self, question, doc_data):
        input_prompt = self.prompt_check_doc.format(question)
        response = self.model.generate_content([{'mime_type': 'application/pdf', 'data': doc_data}, input_prompt])
        result = response.text
        if "yes"==result.lower().strip() or "yes\n"==result.lower().strip():
            return True
        return False
    
    def get_related_documents(self, question):
        related_docs = self.get_similar_documents(question)
        dict_related_docs = {}
        for doc in related_docs:
            doc_data = self.load_file_local(doc)
            if doc_data:
                if self.check_document(question, doc_data):
                    dict_related_docs[doc] = doc_data
        if len(dict_related_docs)==0:
            return None
        return dict_related_docs