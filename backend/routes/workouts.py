"""
Workout routes - exercise logging
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models, schemas
import uuid

router = APIRouter(prefix="/api/workouts", tags=["workouts"])


def uid():
    return str(uuid.uuid4())[:8]


@router.post("/", response_model=schemas.WorkoutResponse)
async def create_workout(workout: schemas.WorkoutCreate, db: Session = Depends(get_db)):
    """Log a workout"""
    db_workout = models.Workout(
        id=uid(),
        type=workout.type,
        duration=workout.duration,
        distance=workout.distance,
        notes=workout.notes,
        date=workout.date,
        saved_at=""
    )
    db.add(db_workout)
    db.commit()
    db.refresh(db_workout)

    db_workout.saved_at = db_workout.created_at.isoformat()
    db.commit()
    db.refresh(db_workout)

    return {
        "id": db_workout.id,
        "type": db_workout.type,
        "duration": db_workout.duration,
        "distance": db_workout.distance,
        "notes": db_workout.notes,
        "date": db_workout.date,
        "saved_at": db_workout.saved_at
    }


@router.get("/", response_model=list[schemas.WorkoutResponse])
async def get_workouts(db: Session = Depends(get_db)):
    """Get all workouts"""
    workouts = db.query(models.Workout).order_by(models.Workout.created_at.desc()).all()
    return [
        {
            "id": w.id,
            "type": w.type,
            "duration": w.duration,
            "distance": w.distance,
            "notes": w.notes,
            "date": w.date,
            "saved_at": w.saved_at or w.created_at.isoformat()
        }
        for w in workouts
    ]


@router.delete("/{workout_id}")
async def delete_workout(workout_id: str, db: Session = Depends(get_db)):
    """Delete a workout"""
    workout = db.query(models.Workout).filter(models.Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    db.delete(workout)
    db.commit()
    return {"status": "deleted"}
