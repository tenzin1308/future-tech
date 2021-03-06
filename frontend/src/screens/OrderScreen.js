import Axios from "axios";
import { PayPalButton } from "react-paypal-button-v2";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  deliverOrder,
  detailsOrder,
  payOrder,
  selectBid,
  complainOnOrder,
} from "../actions/orderActions";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import {
  ORDER_DELIVER_RESET,
  ORDER_PAY_RESET,
} from "../constants/orderConstants";

export default function OrderScreen(props) {
  const orderId = props.match.params.id;
  const [sdkReady, setSdkReady] = useState(false);
  const orderDetails = useSelector((state) => state.orderDetails);
  const { order, loading, error } = orderDetails;
  const userSignin = useSelector((state) => state.userSignin);
  const { userInfo } = userSignin;
  const [selectedBid, setSelectedBid] = useState(null);
  const [justificationNeeded, setJustificationNeeded] = useState(false);
  const [justification, setJustification] = useState("");
  const [clerkWarning, setClerkWarning] = useState("");
  const [shipperWarning, setShipperWarning] = useState("");
  const orderPay = useSelector((state) => state.orderPay);
  const {
    loading: loadingPay,
    error: errorPay,
    success: successPay,
  } = orderPay;
  const orderDeliver = useSelector((state) => state.orderDeliver);
  const {
    loading: loadingDeliver,
    error: errorDeliver,
    success: successDeliver,
  } = orderDeliver;
  const dispatch = useDispatch();
  useEffect(() => {
    const addPayPalScript = async () => {
      const { data } = await Axios.get("/api/config/paypal");
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src = `https://www.paypal.com/sdk/js?client-id=${data}`;
      script.async = true;
      script.onload = () => {
        setSdkReady(true);
      };
      document.body.appendChild(script);
    };
    if (
      !order ||
      successPay ||
      successDeliver ||
      (order && order._id !== orderId)
    ) {
      dispatch({ type: ORDER_PAY_RESET });
      dispatch({ type: ORDER_DELIVER_RESET });
      dispatch(detailsOrder(orderId));
    } else {
      if (!order.isPaid) {
        if (!window.paypal) {
          addPayPalScript();
        } else {
          setSdkReady(true);
        }
      }
      if (order.complain) {
        setClerkWarning(order.complain.clerkWarning);
        setShipperWarning(order.complain.shipperWarning);
      }
    }
  }, [dispatch, orderId, sdkReady, successPay, successDeliver, order]);

  const successPaymentHandler = (paymentResult) => {
    dispatch(payOrder(order, paymentResult));
  };
  const deliverHandler = () => {
    dispatch(deliverOrder(order._id));
  };

  const isSelectedBidAcceptable = () => {
    const bids = order.shipperBids.filter(
      (bid) => bid.shipperId !== selectedBid.shipperId
    );
    for (let bid of bids) {
      if (bid.price < selectedBid.price) {
        setJustificationNeeded(true);
      }
    }
  };

  const complainOnOrderHandler = (_) => {
    dispatch(complainOnOrder(order._id, clerkWarning, shipperWarning));
  };

  useEffect(() => {
    if (selectedBid) {
      isSelectedBidAcceptable();
    }
  }, [selectedBid]);

  return loading ? (
    <LoadingBox></LoadingBox>
  ) : error ? (
    <MessageBox variant="danger">{error}</MessageBox>
  ) : (
    <div>
      <h1>Order {order._id}</h1>
      <div className="row top">
        <div className="col-2">
          <ul>
            <li>
              <div className="card card-body">
                <h2>Shippring</h2>
                <p>
                  <strong>Name:</strong> {order.shippingAddress.fullName} <br />
                  <strong>Address: </strong> {order.shippingAddress.address},
                  {order.shippingAddress.city},{" "}
                  {order.shippingAddress.postalCode},
                  {order.shippingAddress.country}
                  <br />
                  <strong>Shipping Status: </strong> {order.shippingStatus}
                  <br />
                  <strong>Tracking No: </strong> {order.trackingNo}
                </p>
                {order.isDelivered ? (
                  <MessageBox variant="success">
                    Delivered at {order.deliveredAt}
                  </MessageBox>
                ) : (
                  <MessageBox variant="danger">Not Delivered</MessageBox>
                )}
              </div>
            </li>
            <li>
              <div className="card card-body">
                <h2>Payment</h2>
                <p>
                  <strong>Method:</strong> {order.paymentMethod}
                </p>
                {order.isPaid ? (
                  <MessageBox variant="success">
                    Paid at {order.paidAt}
                  </MessageBox>
                ) : (
                  <MessageBox variant="danger">Not Paid</MessageBox>
                )}
              </div>
            </li>
            <li>
              <div className="card card-body">
                <h2>Order Items</h2>
                <ul>
                  {order.orderItems.map((item) => (
                    <li key={item.product}>
                      <div className="row">
                        <div>
                          <img
                            src={item.image}
                            alt={item.name}
                            className="small"
                          ></img>
                        </div>
                        <div className="min-30">
                          <Link to={`/product/${item.product}`}>
                            {item.name}
                          </Link>
                        </div>

                        <div>
                          {item.qty} x ${item.price} = ${item.qty * item.price}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
            {(userInfo.isSeller || userInfo.isAdmin) && (
              <li>
                <div className="card card-body">
                  <h2>Shipper Bids</h2>
                  <ul>
                    {order.shipperBids.map((item) => (
                      <li key={item._id}>
                        <div
                          className={`row ${
                            order.shipper === item.shipperId ||
                            order.shipper?._id === item.shipperId ||
                            selectedBid?.shipperId === item.shipperId
                              ? "highlight-row"
                              : ""
                          }`}
                        >
                          <div className="min-30">{item.shipperName}</div>

                          <div>${item.price}</div>

                          <div>
                            <button
                              onClick={() => {
                                setSelectedBid(item);
                                setJustificationNeeded(false);
                              }}
                              disabled={order.shipper}
                            >
                              {order.shipper === item.shipperId ||
                              order.shipper?._id === item.shipperId
                                ? "Selected"
                                : "Select"}
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                    {justificationNeeded && (
                      <li>
                        <div>
                          <textarea
                            placeholder="Please provide justification"
                            style={{ width: "97%" }}
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            disabled={order.shipper}
                          ></textarea>
                        </div>
                      </li>
                    )}
                    {selectedBid && (
                      <button
                        disabled={order.shipper}
                        onClick={() =>
                          dispatch(
                            selectBid(
                              orderId,
                              selectedBid.price,
                              selectedBid.shipperId,
                              justification
                            )
                          )
                        }
                      >
                        Save
                      </button>
                    )}
                  </ul>
                </div>
              </li>
            )}

            {order.isDelivered && order.user === userInfo._id && (
              <li>
                <div className="card card-body">
                  <h2>Complain To</h2>
                  <ul>
                    <textarea
                      placeholder="Clerk"
                      style={{ width: "97%" }}
                      value={clerkWarning}
                      disabled={order.complain}
                      onChange={(e) => setClerkWarning(e.target.value)}
                    ></textarea>
                    <br />
                    <br />
                    <textarea
                      placeholder="Shipper"
                      style={{ width: "97%" }}
                      value={shipperWarning}
                      disabled={order.complain}
                      onChange={(e) => setShipperWarning(e.target.value)}
                    ></textarea>
                    {/* <textarea
                      placeholder="Purchased Items"
                      style={{ width: "97%" }}
                      // value={justification}
                      // onChange={(e) => setJustification(e.target.value)}
                    ></textarea> */}
                    <br />
                    <br />

                    {!order.complain && (
                      <button onClick={() => complainOnOrderHandler()}>
                        Save
                      </button>
                    )}
                  </ul>
                </div>
              </li>
            )}
          </ul>
        </div>
        <div className="col-1">
          <div className="card card-body">
            <ul>
              <li>
                <h2>Order Summary</h2>
              </li>
              <li>
                <div className="row">
                  <div>Items</div>
                  <div>${order.itemsPrice.toFixed(2)}</div>
                </div>
              </li>
              <li>
                <div className="row">
                  <div>Shipping</div>
                  <div>${order.shippingPrice.toFixed(2)}</div>
                </div>
              </li>
              <li>
                <div className="row">
                  <div>Tax</div>
                  <div>${order.taxPrice.toFixed(2)}</div>
                </div>
              </li>
              <li>
                <div className="row">
                  <div>
                    <strong> Order Total</strong>
                  </div>
                  <div>
                    <strong>${order.totalPrice.toFixed(2)}</strong>
                  </div>
                </div>
              </li>
              {!order.isPaid && (
                <li>
                  {!sdkReady ? (
                    <LoadingBox></LoadingBox>
                  ) : (
                    <>
                      {errorPay && (
                        <MessageBox variant="danger">{errorPay}</MessageBox>
                      )}
                      {loadingPay && <LoadingBox></LoadingBox>}

                      <PayPalButton
                        amount={order.totalPrice}
                        onSuccess={successPaymentHandler}
                      ></PayPalButton>
                    </>
                  )}
                </li>
              )}
              {userInfo.isAdmin && order.isPaid && !order.isDelivered && (
                <li>
                  {loadingDeliver && <LoadingBox></LoadingBox>}
                  {errorDeliver && (
                    <MessageBox variant="danger">{errorDeliver}</MessageBox>
                  )}
                  <button
                    type="button"
                    className="primary block"
                    onClick={deliverHandler}
                  >
                    Deliver Order
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
