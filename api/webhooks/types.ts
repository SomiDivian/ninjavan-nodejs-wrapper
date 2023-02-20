type Event = {
  status?: string;
};

const EventTypes = [
  /**
   * Order is cancelled successfully.
   */
  "Cancelled",
  /**
   * After repeated failed deliveries, the order is sent back to the sender.
   */
  "Returned to Sender",
  /**
   * 	Driver marks the parcel as delivered.
   */
  "Successful Delivery",
  /**
   * Driver marks the parcel as delivered.
   */
  "Completed",
  /**
   * Order is in a customs clearance exception.
   */
  "Customs Held",
  /**
   * Order is ready for pickup from a customs warehouse.
   */
  "Customs Cleared",
  /**
   * Order is in the cross-border leg or, if required, is pending tax payment from the consignee.
   */
  "Cross Border Transit",
  /**
   * Order is created and is at the staging phase.
   */
  "Staging",
  /**
   * Parcel size, or parcel weight, or parcel dimensions have been changed.
   */
  "Parcel Measurements Update",
  /**
   * Parcel weight of the order has been changed.
   */
  "Parcel Weight",
  /**
   * Parcel size of the order has been changed.
   */
  "Parcel Size",
  /**
   * A van has been dispatched to pick up the return order.
   */
  "Van En-route to Pickup",
  /**
   * After repeated failed deliveries, Ninja Van initiates the return flow for the order.
   */
  "Return to Sender Triggered",
  /**
   * Order has been received at a Ninja Point and is waiting to be picked up.
   */
  "Pending Pickup at Distribution Point",
  /**
   * Parcel has been placed at a Ninja Point for customer collection.
   */
  "Arrived at Distribution Point",
  /**
   * Order is in a van and en-route to the sender after a failed delivery.
   */
  "On Vehicle for Delivery (RTS)",
  /**
   * Driver isn't able to deliver the parcel and marks the order as delivery failed.
   */
  "First Attempt Delivery Fail",
  /**
   * Driver marks the order as delivery failed, and the order is waiting to be rescheduled.
   */
  "Pending Reschedule",
  /**
   * Driver picks up the parcel from a sorting hub for delivery.
   */
  "On Vehicle for Delivery",
  /**
   * Order arrives at an origin hub for further processing.
   */
  "Arrived at Origin Hub",
  /**
   * Order is handed over to a 3PL for delivery.
   */
  "Transferred to 3PL",
  /**
   * Order arrives at a sorting hub for further processing.
   */
  "Arrived at Sorting Hub",
  /**
   * Order is picked up and is on the way to a sorting hub.
   */
  "En-route to Sorting Hub",
  /**
   * Driver isn't able to pick up the parcel. The order's waiting for a pickup to be rescheduled.
   */
  "Pickup Fail",
  /**
   * Driver picks up the order.
   */
  "Successful Pickup",
  /**
   * Order creation is fully processed in our system, and the order is waiting to be picked up.
   */
  "Pending Pickup",
] as const;

type EventType = (typeof EventTypes)[number];

const isEventType = (value: unknown): value is EventType => {
  return EventTypes.includes(value as EventType);
};

export type { EventType as NinjaWebhookEventType, Event as NinjaWebhookEvent };
export {
  EventTypes as NinjaWebhookEventTypes,
  isEventType as isNinjaWebhookEventType,
};
