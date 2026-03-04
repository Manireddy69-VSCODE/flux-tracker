from mangum import Mangum

# Import the existing FastAPI app from backend module
# Ensure backend is a package (empty __init__.py added).
from backend.main import app

# Vercel will call this handler for all /api requests
handler = Mangum(app)
