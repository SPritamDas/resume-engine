from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.dependencies import get_current_user
from app.models import User
import razorpay
from datetime import datetime, timedelta

router = APIRouter()
client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

@router.post("/create-order")
def create_order(amount: int, user: User = Depends(get_current_user)):
    order = client.order.create({
        "amount": amount,
        "currency": "INR",
        "receipt": f"order_{user.id}_{int(datetime.utcnow().timestamp())}",
        "notes": {"user_id": user.id}
    })
    return {"order_id": order["id"], "amount": amount, "currency": "INR"}

@router.post("/verify")
def verify_payment(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    params = {
        "razorpay_order_id": razorpay_order_id,
        "razorpay_payment_id": razorpay_payment_id,
        "razorpay_signature": razorpay_signature
    }
    try:
        client.utility.verify_payment_signature(params)
        user.is_paid = True
        user.paid_until = datetime.utcnow() + timedelta(hours=24)
        db.commit()
        return {"status": "success", "message": "Payment verified. Full access unlocked for 24 hours."}
    except Exception:
        raise HTTPException(status_code=400, detail="Payment verification failed")
