from mangum import Mangum

# import your FastAPI app from the backend package
from backend.main import app

handler = Mangum(app)
