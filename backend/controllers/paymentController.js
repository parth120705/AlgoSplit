import Razorpay from 'razorpay';
import crypto from 'crypto';

const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummykey12345',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummysecret12345',
  });
};

// @route   POST /api/payments/order

export const createOrder = async (req, res) => {
  try {
    const { amount } = req.body; 
    
    // Razorpay requires a minimum of 1 INR
    if (!amount || isNaN(amount) || amount < 1) {
      return res.status(400).json({ 
        message: 'Error creating order', 
        error: 'Razorpay requires a minimum amount of ₹1.00' 
      });
    }

    const razorpay = getRazorpayInstance();

    const rzpAmount = Math.min(Number(amount), 500000);
    
    const options = {
      amount: Math.round(rzpAmount * 100), 
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };
    
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error("Razorpay Error:", error);
    const detailedError = error?.error?.description || error?.message || 'Unknown server error';
    res.status(500).json({ message: 'Error creating order', error: detailedError });
  }
};


// @route   POST /api/payments/verify
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'dummysecret12345')
                               .update(sign.toString())
                               .digest("hex");
                               
    if (razorpay_signature === expectedSign) {
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid signature' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error verifying payment', error: error.message });
  }
};


// @route   GET /api/payments/config

export const getConfig = (req, res) => {
  res.json({ key: process.env.RAZORPAY_KEY_ID });
};
