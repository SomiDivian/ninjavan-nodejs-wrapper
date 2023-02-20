import { z } from "zod";
import { validate } from "./utils";

// ----------------------------------
// initiate wrapper
const ninjaCountries = [
  "sg",
  "my",
  "th",
  "id",
  "ph",
  "vn",
  "mm",
  "sg".toUpperCase(),
  "my".toUpperCase(),
  "th".toUpperCase(),
  "id".toUpperCase(),
  "ph".toUpperCase(),
  "vn".toUpperCase(),
  "mm".toUpperCase(),
] as const;
const WrapperArgs = z.object({
  /**
   * @description The base url for the NinjaVan API
   * production: https://api.ninjavan.co
   * sandbox: https://api-sandbox.ninjavan.co
   *
   * https://api-docs.ninjavan.co/en#section/Introduction/Integration-requirements
   */
  clientId: z.string(),
  /** Client ID from your Ninja Dashboard account. */
  clientSecret: z.string(),
  /** Client Key from your Ninja Dashboard account. */
  baseUrl: z
    .string()
    .url()
    .default(
      process.env.NODE_ENV === "development"
        ? "https://api-sandbox.ninjavan.co"
        : "https://api.ninjavan.co"
    ),
  /** Enum: "SG" "MY" "TH" "ID" "VN" "PH" "MM" */
  countryCode: z.enum(ninjaCountries).transform((value) => value.toLowerCase()),
});
type WrapperArgsInput = z.input<typeof WrapperArgs>;

/**
 *
 * @returns an error string or valid { WrapperArgs }
 */
function validWrapperArgs(args: unknown) {
  try {
    return validate(WrapperArgs, args);
  } catch (error: unknown) {
    return (error as Error).message;
  }
}

export { WrapperArgs, validWrapperArgs, ninjaCountries };
export type { WrapperArgsInput };

// ----------------------------------
// get token
const GetToken = z.object({
  /**
   * ninjavan api endpoint to retrieve an access_token
   *
   * https://api-docs.ninjavan.co/en#tag/OAuth-API
   */
  url: z.string().url(),
  input: z.object({
    /** Client ID from your Ninja Dashboard account. */
    client_id: z.string(),
    /** Client Key from your Ninja Dashboard account. */
    client_secret: z.string(),
    /** Value: "client_credentials" */
    grant_type: z.enum(["client_credentials"]).default("client_credentials"),
  }),
});
const GetTokenNinjaResponse = z.object({
  /**
   * Bearer token to be included in the Authorization HTTP header for
   * all API requests.
   */
  access_token: z.string(),
  /* Value: "bearer" */
  token_type: z.string(),
  /* The epoch timestamp at which the access token expires. */
  expires: z.number().min(1),
  /* The number of seconds at which the access token expires. */
  expires_in: z.number().min(300),
});

export { GetToken, GetTokenNinjaResponse };

// ----------------------------------

// create order
const SharedAddress = z.object({
  /** Enum: "SG" "MY" "TH" "ID" "VN" "PH" "MM" */
  country: z
    .enum(ninjaCountries)
    .optional()
    .default("my")
    .transform((value) => value.toUpperCase()),
  /**
   * Enum: "home" "office"
   * Indicates the type of address. The value must be either home or office.
   */
  address_type: z.enum(["home", "office"]).optional().default("home"),
  /**
   * If you are collecting granular address information, concatenate the building number, building name, and street information in this field.
   */
  address1: z.string().min(1).max(255),
  address2: z.string().min(0).max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const MalaysiaAddress = z
  .object({
    area: z.string().max(50).optional(),
    city: z.string().max(50).optional(),
    state: z.string().max(50).optional(),
    /** Required for MY address */
    postcode: z.string().min(5).max(5),
  })
  .merge(SharedAddress);

const SingaporeAddress = z
  .object({
    postcode: z.string().min(6).max(6),
  })
  .merge(SharedAddress);

const IndonesiaAddress = z
  .object({
    /** For ID addresses */
    kelurahan: z.string().max(50).optional(),
    /** For ID addresses */
    kecamatan: z.string().max(50).optional(),
    /** For ID addresses */
    city: z.string().max(50).optional(),
    /** For ID addresses */
    province: z.string().max(50).optional(),
    /** Postal code for ID addresses. */
    postcode: z.string().min(5).max(5).optional(),
  })
  .merge(SharedAddress);

const Address = z
  .union([SingaporeAddress, IndonesiaAddress, MalaysiaAddress])
  .refine((value) => {
    if (value.country === "MY" && !value.postcode) {
      return {
        message: "postcode is required for MY addresses",
        path: ["postcode"],
      };
    }
    if (value.country === "SG" && !value.postcode) {
      return {
        message: "postcode is required for SG addresses",
        path: ["postcode"],
      };
    }
    return true;
  });
const Person = z
  .object({
    name: z.string().min(3).max(255),
    /**
     * Phone number of the contact.
     * The API attempts to format the number based on the E.164 format, using the country code of the address provided. If it can be formatted, then the number is considered valid.
     * The API only requires that either the email or phone_number is valid.
     */
    phone_number: z.string().min(6).max(32).optional(),
    /**
     * Email address of the contact.
     * Must be a valid email address format. The formal definitions are in RFC 5322 (sections 3.2.3 and 3.4.1) and RFC 5321, with a more readable form given in the informational RFC 3696 and the associated errata.
     * The API only requires that either the email or phone_number is valid. If an email is provided, the API validates it and returns an error if the validation fails.
     */
    email: z.string().email().optional(),
    address: Address,
    /**
     * Enum: "Ninja PUDO @ Orchard" "Ninja PUDO @ NUH"
     * This field is experimental.
     */
    collection_point: z
      .enum(["Ninja PUDO @ Orchard", "Ninja PUDO @ NUH"])
      .optional(),
  })
  .refine((value) => {
    if (!value.phone_number && !value.email) {
      return {
        message: "Either phone_number or email must be provided",
        path: ["phone_number", "email"],
      };
    }
    return true;
  });

/**
 * takes a string of date to return yyyy-MM-dd formatted date string
 */
const ninjaFormat = (value: string) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const MM = month < 10 ? `0${month}` : month;
  const DD = day < 10 ? `0${day}` : day;

  return `${year}-${MM}-${DD}`;
};
const ParcelJob = z.object({
  /**
   * Specifies the start date of the delivery period in the yyyy-MM-dd format. For example, for standard orders that take 3 days, if the delivery_start_date is on 2021-12-15, the delivery will be attempted at any time from 2021-12-15 to 2021-12-17.
   * The API automatically adjust the date for blocked dates. Double check for the adjusted delivery_start_date in response.
   * If an order is created before the cutoff time, the API defaults delivery_start_date to the same day, if that day is not a blocked date. Otherwise, delivery_start_date is defaulted to the next available date.
   */
  delivery_start_date: z
    .string()
    .transform((value) => ninjaFormat(value))
    .refine((value) => {
      const reg = /^([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))$/;
      return reg.test(value);
    }),
  /** Delivery time slot information. The valid time slots are: */
  delivery_timeslot: z
    .object({
      start_time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      end_time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      /**
       * Enum: "Asia/Singapore" "Asia/Kuala_Lumpur" "Asia/Jakarta" "Asia/Jayapura" "Asia/Makassar" "Asia/Bangkok" "Asia/Manila" "Asia/Ho_Chi_Minh" "Asia/Yangon"
       */
      timezone: z
        .enum(["Asia/Singapore", "Asia/Kuala_Lumpur", "Asia/Jakarta"])
        .optional(),
    })
    .default({
      start_time: "09:00",
      end_time: "22:00",
      timezone: "Asia/Kuala_Lumpur",
    }),

  /** Delivery instructions for the driver. */
  delivery_instructions: z.string().max(255).optional(),
  /**
   * Indicates whether the customer is allowed to self-collect the parcels. Required if a valid delivery collection point (to.collection_point) is specified.
   */
  allow_self_collection: z.boolean().optional(),
  /** Specifies whether deliveries can be attempted on weekends. default: true */
  allow_weekend_delivery: z.boolean().optional(),
  /**
   * Specifies the amount of cash to be collected from the recipient upon delivery.
   */
  cash_on_delivery: z
    .number()
    .min(0)
    .max(100000)
    .transform((value) => parseFloat(value.toFixed(2)))
    .optional(),
  /** Specifies the desired insured value of the parcel. */
  insured_value: z
    .number()
    .min(0)
    .max(100000)
    .transform((value) => parseFloat(value.toFixed(2)))
    .optional(),
  /** Dimension information of parcels or objects. */
  dimensions: z
    .object({
      size: z.enum(["S", "M", "L", "XL", "XXL"]).optional(),
      /** in cm */
      length: z.number().optional(),
      /** in cm */
      height: z.number().optional(),
      /** in cm */
      width: z.number().optional(),
      /** in kg */
      weight: z.number().optional(),
    })
    .default({
      size: "S",
      weight: 1,
    }),

  /**
   * Default: false
   * Indicates whether a pickup reservation is required. If set to true, the system checks if a pickup reservation exists with the same:
   *
   * pickup_date
   * Pickup address (inferred from the parcel_job.pickup_address or from.address)
   * The system creates a new pickup reservation if none exists for the current pickup date and address.
   *
   * To update the pickup address for a specific pickup_address_slot_id, use one of these options:
   *
   * Call Ninja Van's shipper support hotline.
   * Update the address tied to the pickup_address_id via the pickup reservation API.
   * Send a new order with an updated pickup address.
   * The pickup address specified in either the from or pickup_address field will be used to update the address tied to the pickup_address_id.
   *
   * Existing pickup reservations tied to this pickup_address_id, that are already in progress, won't be modified in any way.
   *
   * You account can be configured to not update future pickup reservation addresses even if the address tied to the pickup_address_id has changed.
   *
   * To update the pickup time slot for a specific pickup reservation, use one of these options:
   *
   * Call Ninja Van's shipper support hotline.
   * Send a new order with the same pickup_address_id and pickup_date, but with a different pickup_timeslot.
   * For more details, refer to the notes for the pickup_timeslot and pickup_address_id fields.
   *
   * If you require a Scheduled pickup, then provide the following fields:
   *
   * pickup_date
   * pickup_timeslot
   * pickup_approximate_volume
   */
  is_pickup_required: z.boolean().default(false),
  items: z.array(
    z.object({
      /** The description of the item. */
      item_description: z.string().max(255),
      /** Total quantity of the item. */
      quantity: z.number().optional(),
      /** Declaration of dangerous goods for air freight. */
      is_dangerous_good: z.boolean().optional(),
    })
  ),
});

const CreateResourceArgs = z.object({
  /**
   * Indicates the type of service. Used to inform Ninja Van on what jobs to schedule for this order.
   */
  service_type: z
    .enum([
      "Parcel",
      "Marketplace",
      "Corporate",
      "International",
      "Bulky",
      "Document",
      "Return",
    ])
    .default("Parcel"),
  /**
   *  Enum: "Standard" "Express" "Sameday" "Nextday"
   * Shipment service level.
   */
  service_level: z
    .enum(["Standard", "Express", "Sameday", "Nextday"])
    .default("Standard"),
  /**
   * f your shipper account is a prefixless account, then requested_tracking_number is required.
   * If your shipper account has a tracking number prefix configured, then the API concatenates your prefix with the requested_tracking_number to generate the waybill tracking number.
   * If requested_tracking_number isn't provided, then the API automatically generates a random tracking number and concatenates your prefix with it to generate the waybill tracking number.
   * A generic prefix is used for this request, if your account does not have a prefix and if the requested_tracking_number is not provided.
   * The total length of the generated tracking_number is further validated based on your shipper settings.
   * The default length for tracking_number is around 18 characters. If the requested_tracking_number is too short, the API auto-pads the value with zeros (0).
   * Check with us if you have any questions regarding your shipper account settings.
   */
  requested_tracking_number: z
    .string()
    .min(9)
    .max(18)
    .regex(/^([a-zA-Z0-9]+[-])*[a-zA-Z0-9]+$/)
    .optional(),

  /**
   * Reference information. This information returns to the shipper via webhooks, and can be used as query parameters when retrieving orders from our API.
   */
  reference: z
    .object({
      /** Identifier of the order in shipper's systems. */
      merchant_order_number: z.string().max(255).optional(),
    })
    .optional(),

  /**
   * Sender's information. Used for the following:
   * Contact details for informing the sender regarding parcel updates.
   * Address details to be printed on the waybill.
   */
  from: Person,
  /**
   * Recipient's information. Used for the following:
   * Delivery destination.
   * Contact details for informing the recipient regarding parcel updates.
   * Address details to be printed on the waybill.
   */
  to: Person,
  /**
   * Details of the parcel's pickup and delivery jobs.
   * If no pickup address is provided, Ninja Van uses the default pickup address specified in the shipper pickup reservation settings.
   */
  parcel_job: ParcelJob,
});

const CreateOrder = z.object({
  url: z.string(),
  input: CreateResourceArgs,
});
const CreateOrderNinjaResponse = z.object({
  /**
   * f your shipper account is a prefixless account, then requested_tracking_number is required.
   * If your shipper account has a tracking number prefix configured, then the API concatenates your prefix with the requested_tracking_number to generate the waybill tracking number.
   * If requested_tracking_number isn't provided, then the API automatically generates a random tracking number and concatenates your prefix with it to generate the waybill tracking number.
   * A generic prefix is used for this request, if your account does not have a prefix and if the requested_tracking_number is not provided.
   * The total length of the generated tracking_number is further validated based on your shipper settings.
   * The default length for tracking_number is around 18 characters. If the requested_tracking_number is too short, the API auto-pads the value with zeros (0).
   * Check with us if you have any questions regarding your shipper account settings.
   */
  requested_tracking_number: z.string().optional(),
  tracking_number: z.string(),

  /**
   * Indicates the type of service. Used to inform Ninja Van on what jobs to schedule for this order.
   */
  service_type: z
    .enum([
      "Parcel",
      // TODO: I need to add the related response to these `service_type`s
      // "Marketplace",
      // "Corporate",
      // "International",
      // "Bulky",
      // "Document",
      // "Return",
    ])
    .optional(),

  /**
   * Enum: "Standard" "Express" "Sameday" "Nextday"
   * Shipment service level.
   */
  service_level: z
    .enum(["Standard", "Express", "Sameday", "Nextday"])
    .or(z.string())
    .optional(),

  reference: z
    .object({
      /** Identifier of the order in shipper's systems. */
      merchant_order_number: z.string().max(255).optional(),
    })
    .optional(),

  /**
   * Sender's information. Used for the following:
   * Contact details for informing the sender regarding parcel updates.
   * Address details to be printed on the waybill.
   */
  from: Person.optional(),

  /**
   * Recipient's information. Used for the following:
   * Delivery destination.
   * Contact details for informing the recipient regarding parcel updates.
   * Address details to be printed on the waybill.
   */
  to: Person.optional(),

  /**
   * Details of the parcel's pickup and delivery jobs.
   * If no pickup address is provided, Ninja Van uses the default pickup address specified in the shipper pickup reservation settings.
   */
  parcel_job: ParcelJob.optional(),
});

type CreateOrderInput = z.input<typeof CreateOrder>;

export { CreateOrder, CreateOrderNinjaResponse };
export type { CreateOrderInput };

// --------------------------------------------
// cancel order
const CancelOrderNinjaResponse = z.object({
  /** Tracking ID of the order that was cancelled. */
  trackingId: z.string().optional(),
  /** Status of the order. */
  status: z.string().optional(),
  /** Date on which the order was cancelled. */
  updatedAt: z.string().or(z.null()).optional(),
});
const CancelOrder = z.object({
  url: z.string(),
});

export { CancelOrder, CancelOrderNinjaResponse };

// --------------------------------------------
// generate waybill

const GenerateWaybill = z.object({
  url: z.string(),
});
const GenerateWaybillNinjaResponse = z.any();

export { GenerateWaybill, GenerateWaybillNinjaResponse };

// --------------------------------------------
// track order
const TrackOrder = z.object({
  url: z.string(),
});
const TrackOrderNinjaResponse = z.object({
  tracking_number: z.string().optional(),
  /** Determine if full events are available for the tracking number provided. */
  is_full_history_available: z.boolean().optional(),
  events: z
    .array(
      z.object({
        /** Identifier of the shipper. */
        shipper_id: z.string().optional(),
        /** Identifier of the order. */
        tracking_number: z.string().optional(),
        /** Identifier of the order in shipper's systems. */
        shipper_order_ref_no: z.string().optional(),
        /** Timestamp of the event. */
        timestamp: z.string().optional(),
        /** Status of the order. */
        status: z.string().optional(),
        /** Determine if it is a return parcel. */
        is_parcel_on_rts_leg: z.boolean().optional(),
        /** Country, city and shortname of the inbounded hub. */
        WebhookV1HubLocation: z.string().optional(),
        /**
         * in_transit_to_next_sorting_hub_information (object) or arrived_at_destination_hub_information (object)
         * Location of the hub for the respective status.
         */
        WebhookV2HubLocation: z
          .object({
            country: z.string().optional(),
            city: z.string().optional(),
            hub: z.string().optional(),
          })
          .optional(),
      })
    )
    .default([]),
});

export { TrackOrder, TrackOrderNinjaResponse };

// --------------------------------------------
// track orders
const TrackOrders = z.object({
  url: z.string(),
});
const TrackOrdersNinjaResponse = z.object({
  data: z.array(
    z.object({
      tracking_number: z.string().optional(),
      /** Determine if full events are available for the tracking number provided. */
      is_full_history_available: z.boolean().optional(),
      events: z
        .array(
          z.object({
            /** Identifier of the shipper. */
            shipper_id: z.string().optional(),
            /** Identifier of the order. */
            tracking_number: z.string().optional(),
            /** Identifier of the order in shipper's systems. */
            shipper_order_ref_no: z.string().optional(),
            /** Timestamp of the event. */
            timestamp: z.string().optional(),
            /** Status of the order. */
            status: z.string().optional(),
            /** Determine if it is a return parcel. */
            is_parcel_on_rts_leg: z.boolean().optional(),
            /** Country, city and shortname of the inbounded hub. */
            WebhookV1HubLocation: z.string().optional(),
            /**
             * in_transit_to_next_sorting_hub_information (object) or arrived_at_destination_hub_information (object)
             * Location of the hub for the respective status.
             */
            WebhookV2HubLocation: z
              .object({
                country: z.string().optional(),
                city: z.string().optional(),
                hub: z.string().optional(),
              })
              .optional(),
          })
        )
        .default([]),
    })
  ),
});

export { TrackOrders, TrackOrdersNinjaResponse };

// generate custom airway bill
const CustomWaybill = z.object({
  trackingId: z.string(),
  type: z.string(), // Parcel
  weight: z.number(),
  receiver: z.object({
    name: z.string(),
    contact: z.string(),
    address: z.string(),
  }),
  sender: z.object({
    name: z.string(),
    contact: z.string().optional(),
    address: z.string().optional(),
  }),
  cod: z.object({
    amount: z.number(),
    currency: z.string().optional(),
  }),
  deliveryDate: z.string(),
  comments: z.string().optional(),
});

type CustomWaybillInput = z.input<typeof CustomWaybill> & {
  // so i can override it when needed
  codes?: {
    barcode: Buffer;
    qrcode: Buffer;
  };
};

export { CustomWaybill };
export type { CustomWaybillInput };
