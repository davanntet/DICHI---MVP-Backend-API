import os
from dotenv import load_dotenv
from pdf_to_text import PDF2Text
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import chromadb
import uuid

def random_uuid():
    return str(uuid.uuid4())

class AgenticDataPipline:
    _instance = None
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AgenticDataPipline, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, 'initialized'):
            load_dotenv()
            self.converter = PDF2Text()
            self.data_source_path = os.environ.get('DATA_SOURCE_PATH')
            self.list_of_files = os.listdir(path=self.data_source_path)
            self.text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
                chunk_size=512, chunk_overlap=100,
            )
            self.embedding_model = SentenceTransformer(os.environ.get('EMBEDDING_MODEL'))
            chroma_client = chromadb.PersistentClient(os.environ.get('DATABASE_FOLDER'))
            self.chroma_db = chroma_client.get_or_create_collection(
                name=os.environ.get('DB_NAME'),
                metadata={
                    "hnsw:space": "cosine",
                    "hnsw:search_ef": 100
                }
            )
            self.chroma_db_title = chroma_client.get_or_create_collection(
                name=os.environ.get('DB_NAME_TITLE'),
                metadata={
                    "hnsw:space": "cosine",
                    "hnsw:search_ef": 100
                }
            )
            self.initialized = True
        
    def batch_pdf_to_text(self):
        key_docs = dict(zip(range(len(self.list_of_files)),self.list_of_files))
        list_of_contents = dict()
        for key, value in key_docs.items():
            list_of_contents[value] = self.converter.pdf_to_text(f'{self.data_source_path}/{value}')
            print(f'{value} done')
        return list_of_contents
        
    def batch_processing(self):
        try:
            extracted_data = self.batch_pdf_to_text()
            documents = [Document(page_content=value, metadata={"source":key}) for key,docs in extracted_data.items() for value in docs]
            doc_splits = self.text_splitter.split_documents(documents)
            for doc in doc_splits:
                embeddings = self.embedding_model.encode(doc.page_content)
                metadatas = {"source": doc.metadata["source"]}
                documents = doc.page_content
                self.chroma_db.add(documents=[documents], embeddings=[embeddings], metadatas=[metadatas], ids=[random_uuid()])
                
            titles = list(extracted_data.keys())
            title_embeddings = self.embedding_model.encode(titles)
            title_metadatas = {"source": "title"}
            self.chroma_db_title.add(documents=titles, embeddings=title_embeddings, ids=[random_uuid() for _ in range(len(titles))])
            return True
        except Exception as e:
            print(e)
            return False
    
    def single_ddf_to_text(self, file_name):
        return self.converter.pdf_to_text(f"{self.data_source_path}/{file_name}")
    
    def single_precessing(self, file_name):
        try:
            extracted_data = self.single_ddf_to_text(file_name)
            document = [Document(page_content=value, metadata={"source":file_name}) for value in extracted_data]
            doc_splits = self.text_splitter.split_documents(document)
            for doc in doc_splits:
                embeddings = self.embedding_model.encode(doc.page_content)
                metadatas = {"source": doc.metadata["source"]}
                documents = doc.page_content
                self.chroma_db.add(documents=[documents], embeddings=[embeddings], metadatas=[metadatas], ids=[random_uuid()])
            return True
        except Exception as e:
            print(e)
            return False

