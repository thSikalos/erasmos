--
-- PostgreSQL database dump
--

\restrict LSxtaB1nB6Q7BLquFsDCQ9sERAGmz8qZnWxjtIbaiMzJOpKZFmJ26JUrsFBbOKn

-- Dumped from database version 17.6 (Debian 17.6-1.pgdg13+1)
-- Dumped by pg_dump version 17.6 (Debian 17.6-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: application_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.application_comments (
    id integer NOT NULL,
    application_id integer NOT NULL,
    user_id integer NOT NULL,
    comment text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.application_comments OWNER TO postgres;

--
-- Name: application_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.application_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.application_comments_id_seq OWNER TO postgres;

--
-- Name: application_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.application_comments_id_seq OWNED BY public.application_comments.id;


--
-- Name: application_values; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.application_values (
    id integer NOT NULL,
    application_id integer NOT NULL,
    field_id integer NOT NULL,
    value text NOT NULL
);


ALTER TABLE public.application_values OWNER TO postgres;

--
-- Name: application_values_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.application_values_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.application_values_id_seq OWNER TO postgres;

--
-- Name: application_values_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.application_values_id_seq OWNED BY public.application_values.id;


--
-- Name: applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.applications (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    user_id integer NOT NULL,
    status character varying(50) DEFAULT 'Προς Καταχώρηση'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_paid_by_company boolean DEFAULT false NOT NULL,
    company_id integer,
    total_commission numeric(10,2),
    contract_end_date date,
    pending_reason text,
    is_personal boolean DEFAULT false NOT NULL
);


ALTER TABLE public.applications OWNER TO postgres;

--
-- Name: applications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.applications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.applications_id_seq OWNER TO postgres;

--
-- Name: applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.applications_id_seq OWNED BY public.applications.id;


--
-- Name: attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attachments (
    id integer NOT NULL,
    application_id integer NOT NULL,
    user_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.attachments OWNER TO postgres;

--
-- Name: attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attachments_id_seq OWNER TO postgres;

--
-- Name: attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attachments_id_seq OWNED BY public.attachments.id;


--
-- Name: billing_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.billing_settings (
    id integer NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value character varying(255) NOT NULL
);


ALTER TABLE public.billing_settings OWNER TO postgres;

--
-- Name: billing_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.billing_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.billing_settings_id_seq OWNER TO postgres;

--
-- Name: billing_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.billing_settings_id_seq OWNED BY public.billing_settings.id;


--
-- Name: bonuses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bonuses (
    id integer NOT NULL,
    creator_id integer NOT NULL,
    target_user_id integer NOT NULL,
    name character varying(255) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    application_count_target integer NOT NULL,
    bonus_amount_per_application numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.bonuses OWNER TO postgres;

--
-- Name: bonuses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bonuses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bonuses_id_seq OWNER TO postgres;

--
-- Name: bonuses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bonuses_id_seq OWNED BY public.bonuses.id;


--
-- Name: clawbacks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clawbacks (
    id integer NOT NULL,
    user_id integer NOT NULL,
    application_id integer,
    amount numeric(10,2) NOT NULL,
    reason text,
    is_settled boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.clawbacks OWNER TO postgres;

--
-- Name: clawbacks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clawbacks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clawbacks_id_seq OWNER TO postgres;

--
-- Name: clawbacks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clawbacks_id_seq OWNED BY public.clawbacks.id;


--
-- Name: communication_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.communication_log (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    user_id integer NOT NULL,
    note text NOT NULL,
    method character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.communication_log OWNER TO postgres;

--
-- Name: communication_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.communication_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.communication_log_id_seq OWNER TO postgres;

--
-- Name: communication_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.communication_log_id_seq OWNED BY public.communication_log.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    name character varying(150) NOT NULL
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.companies_id_seq OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: company_fields; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_fields (
    company_id integer NOT NULL,
    field_id integer NOT NULL
);


ALTER TABLE public.company_fields OWNER TO postgres;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    afm character varying(20) NOT NULL,
    full_name character varying(150) NOT NULL,
    phone character varying(50),
    address character varying(255),
    notes text,
    created_by_user_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customers_id_seq OWNER TO postgres;

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: discount_tiers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.discount_tiers (
    id integer NOT NULL,
    application_target integer NOT NULL,
    discount_percentage numeric(5,2) NOT NULL
);


ALTER TABLE public.discount_tiers OWNER TO postgres;

--
-- Name: discount_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.discount_tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.discount_tiers_id_seq OWNER TO postgres;

--
-- Name: discount_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.discount_tiers_id_seq OWNED BY public.discount_tiers.id;


--
-- Name: dynamic_fields; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dynamic_fields (
    id integer NOT NULL,
    category_id integer NOT NULL,
    field_name character varying(100) NOT NULL,
    field_type character varying(50) DEFAULT 'text'::character varying NOT NULL
);


ALTER TABLE public.dynamic_fields OWNER TO postgres;

--
-- Name: dynamic_fields_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dynamic_fields_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dynamic_fields_id_seq OWNER TO postgres;

--
-- Name: dynamic_fields_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dynamic_fields_id_seq OWNED BY public.dynamic_fields.id;


--
-- Name: fields; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fields (
    id integer NOT NULL,
    label character varying(150) NOT NULL,
    type character varying(50) NOT NULL,
    is_commissionable boolean DEFAULT false NOT NULL
);


ALTER TABLE public.fields OWNER TO postgres;

--
-- Name: fields_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fields_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fields_id_seq OWNER TO postgres;

--
-- Name: fields_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fields_id_seq OWNED BY public.fields.id;


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_items (
    invoice_id integer NOT NULL,
    application_id integer NOT NULL
);


ALTER TABLE public.invoice_items OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    message text NOT NULL,
    status character varying(50) DEFAULT 'unread'::character varying NOT NULL,
    channel character varying(50) NOT NULL,
    link_url character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: payment_statements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_statements (
    id integer NOT NULL,
    creator_id integer NOT NULL,
    recipient_id integer NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    status character varying(50) DEFAULT 'Draft'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    subtotal numeric(10,2),
    vat_amount numeric(10,2)
);


ALTER TABLE public.payment_statements OWNER TO postgres;

--
-- Name: payment_statements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_statements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_statements_id_seq OWNER TO postgres;

--
-- Name: payment_statements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_statements_id_seq OWNED BY public.payment_statements.id;


--
-- Name: reminders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reminders (
    id integer NOT NULL,
    creator_id integer NOT NULL,
    assignee_id integer NOT NULL,
    title text NOT NULL,
    due_date date NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.reminders OWNER TO postgres;

--
-- Name: reminders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reminders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reminders_id_seq OWNER TO postgres;

--
-- Name: reminders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reminders_id_seq OWNED BY public.reminders.id;


--
-- Name: statement_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.statement_items (
    id integer NOT NULL,
    statement_id integer NOT NULL,
    application_id integer NOT NULL
);


ALTER TABLE public.statement_items OWNER TO postgres;

--
-- Name: statement_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.statement_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.statement_items_id_seq OWNER TO postgres;

--
-- Name: statement_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.statement_items_id_seq OWNED BY public.statement_items.id;


--
-- Name: team_leader_billing_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_leader_billing_settings (
    team_leader_id integer NOT NULL,
    charge_per_application numeric(10,2) NOT NULL
);


ALTER TABLE public.team_leader_billing_settings OWNER TO postgres;

--
-- Name: team_leader_invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_leader_invoices (
    id integer NOT NULL,
    team_leader_id integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    application_count integer NOT NULL,
    base_charge numeric(10,2) NOT NULL,
    discount_applied numeric(5,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    vat_amount numeric(10,2) NOT NULL,
    total_charge numeric(10,2) NOT NULL,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.team_leader_invoices OWNER TO postgres;

--
-- Name: team_leader_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.team_leader_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.team_leader_invoices_id_seq OWNER TO postgres;

--
-- Name: team_leader_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.team_leader_invoices_id_seq OWNED BY public.team_leader_invoices.id;


--
-- Name: user_agreements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_agreements (
    id integer NOT NULL,
    user_id integer NOT NULL,
    ip_address character varying(50),
    user_agent text,
    accepted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_agreements OWNER TO postgres;

--
-- Name: user_agreements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_agreements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_agreements_id_seq OWNER TO postgres;

--
-- Name: user_agreements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_agreements_id_seq OWNED BY public.user_agreements.id;


--
-- Name: user_commissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_commissions (
    id integer NOT NULL,
    associate_id integer NOT NULL,
    company_id integer NOT NULL,
    amount numeric(10,2) NOT NULL
);


ALTER TABLE public.user_commissions OWNER TO postgres;

--
-- Name: user_commissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_commissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_commissions_id_seq OWNER TO postgres;

--
-- Name: user_commissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_commissions_id_seq OWNED BY public.user_commissions.id;


--
-- Name: user_field_commissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_field_commissions (
    id integer NOT NULL,
    associate_id integer NOT NULL,
    field_id integer NOT NULL,
    amount numeric(10,2) NOT NULL
);


ALTER TABLE public.user_field_commissions OWNER TO postgres;

--
-- Name: user_field_commissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_field_commissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_field_commissions_id_seq OWNER TO postgres;

--
-- Name: user_field_commissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_field_commissions_id_seq OWNED BY public.user_field_commissions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(100) NOT NULL,
    role character varying(50) NOT NULL,
    parent_user_id integer,
    address character varying(255),
    afm character varying(20),
    profession character varying(100),
    is_vat_liable boolean DEFAULT false NOT NULL,
    phone character varying(50),
    deleted_at timestamp with time zone,
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: application_comments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_comments ALTER COLUMN id SET DEFAULT nextval('public.application_comments_id_seq'::regclass);


--
-- Name: application_values id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_values ALTER COLUMN id SET DEFAULT nextval('public.application_values_id_seq'::regclass);


--
-- Name: applications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications ALTER COLUMN id SET DEFAULT nextval('public.applications_id_seq'::regclass);


--
-- Name: attachments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attachments ALTER COLUMN id SET DEFAULT nextval('public.attachments_id_seq'::regclass);


--
-- Name: billing_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_settings ALTER COLUMN id SET DEFAULT nextval('public.billing_settings_id_seq'::regclass);


--
-- Name: bonuses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bonuses ALTER COLUMN id SET DEFAULT nextval('public.bonuses_id_seq'::regclass);


--
-- Name: clawbacks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clawbacks ALTER COLUMN id SET DEFAULT nextval('public.clawbacks_id_seq'::regclass);


--
-- Name: communication_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communication_log ALTER COLUMN id SET DEFAULT nextval('public.communication_log_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: discount_tiers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discount_tiers ALTER COLUMN id SET DEFAULT nextval('public.discount_tiers_id_seq'::regclass);


--
-- Name: dynamic_fields id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_fields ALTER COLUMN id SET DEFAULT nextval('public.dynamic_fields_id_seq'::regclass);


--
-- Name: fields id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fields ALTER COLUMN id SET DEFAULT nextval('public.fields_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: payment_statements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_statements ALTER COLUMN id SET DEFAULT nextval('public.payment_statements_id_seq'::regclass);


--
-- Name: reminders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminders ALTER COLUMN id SET DEFAULT nextval('public.reminders_id_seq'::regclass);


--
-- Name: statement_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statement_items ALTER COLUMN id SET DEFAULT nextval('public.statement_items_id_seq'::regclass);


--
-- Name: team_leader_invoices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_leader_invoices ALTER COLUMN id SET DEFAULT nextval('public.team_leader_invoices_id_seq'::regclass);


--
-- Name: user_agreements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_agreements ALTER COLUMN id SET DEFAULT nextval('public.user_agreements_id_seq'::regclass);


--
-- Name: user_commissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_commissions ALTER COLUMN id SET DEFAULT nextval('public.user_commissions_id_seq'::regclass);


--
-- Name: user_field_commissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_field_commissions ALTER COLUMN id SET DEFAULT nextval('public.user_field_commissions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: application_comments application_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_comments
    ADD CONSTRAINT application_comments_pkey PRIMARY KEY (id);


--
-- Name: application_values application_values_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_values
    ADD CONSTRAINT application_values_pkey PRIMARY KEY (id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: billing_settings billing_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_settings
    ADD CONSTRAINT billing_settings_pkey PRIMARY KEY (id);


--
-- Name: billing_settings billing_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_settings
    ADD CONSTRAINT billing_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: bonuses bonuses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bonuses
    ADD CONSTRAINT bonuses_pkey PRIMARY KEY (id);


--
-- Name: clawbacks clawbacks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clawbacks
    ADD CONSTRAINT clawbacks_pkey PRIMARY KEY (id);


--
-- Name: communication_log communication_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communication_log
    ADD CONSTRAINT communication_log_pkey PRIMARY KEY (id);


--
-- Name: companies companies_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_name_key UNIQUE (name);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_fields company_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_fields
    ADD CONSTRAINT company_fields_pkey PRIMARY KEY (company_id, field_id);


--
-- Name: customers customers_afm_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_afm_key UNIQUE (afm);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: discount_tiers discount_tiers_application_target_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discount_tiers
    ADD CONSTRAINT discount_tiers_application_target_key UNIQUE (application_target);


--
-- Name: discount_tiers discount_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discount_tiers
    ADD CONSTRAINT discount_tiers_pkey PRIMARY KEY (id);


--
-- Name: dynamic_fields dynamic_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_fields
    ADD CONSTRAINT dynamic_fields_pkey PRIMARY KEY (id);


--
-- Name: fields fields_label_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fields
    ADD CONSTRAINT fields_label_key UNIQUE (label);


--
-- Name: fields fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fields
    ADD CONSTRAINT fields_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (invoice_id, application_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payment_statements payment_statements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_statements
    ADD CONSTRAINT payment_statements_pkey PRIMARY KEY (id);


--
-- Name: reminders reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_pkey PRIMARY KEY (id);


--
-- Name: statement_items statement_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statement_items
    ADD CONSTRAINT statement_items_pkey PRIMARY KEY (id);


--
-- Name: team_leader_billing_settings team_leader_billing_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_leader_billing_settings
    ADD CONSTRAINT team_leader_billing_settings_pkey PRIMARY KEY (team_leader_id);


--
-- Name: team_leader_invoices team_leader_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_leader_invoices
    ADD CONSTRAINT team_leader_invoices_pkey PRIMARY KEY (id);


--
-- Name: user_agreements user_agreements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_agreements
    ADD CONSTRAINT user_agreements_pkey PRIMARY KEY (id);


--
-- Name: user_agreements user_agreements_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_agreements
    ADD CONSTRAINT user_agreements_user_id_key UNIQUE (user_id);


--
-- Name: user_commissions user_commissions_associate_id_company_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_commissions
    ADD CONSTRAINT user_commissions_associate_id_company_id_key UNIQUE (associate_id, company_id);


--
-- Name: user_commissions user_commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_commissions
    ADD CONSTRAINT user_commissions_pkey PRIMARY KEY (id);


--
-- Name: user_field_commissions user_field_commissions_associate_id_field_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_field_commissions
    ADD CONSTRAINT user_field_commissions_associate_id_field_id_key UNIQUE (associate_id, field_id);


--
-- Name: user_field_commissions user_field_commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_field_commissions
    ADD CONSTRAINT user_field_commissions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: application_comments application_comments_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_comments
    ADD CONSTRAINT application_comments_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: application_comments application_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_comments
    ADD CONSTRAINT application_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: application_values application_values_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_values
    ADD CONSTRAINT application_values_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: application_values application_values_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_values
    ADD CONSTRAINT application_values_field_id_fkey FOREIGN KEY (field_id) REFERENCES public.fields(id) ON DELETE RESTRICT;


--
-- Name: applications applications_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: applications applications_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: applications applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: attachments attachments_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: attachments attachments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: bonuses bonuses_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bonuses
    ADD CONSTRAINT bonuses_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id);


--
-- Name: bonuses bonuses_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bonuses
    ADD CONSTRAINT bonuses_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id);


--
-- Name: clawbacks clawbacks_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clawbacks
    ADD CONSTRAINT clawbacks_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id);


--
-- Name: clawbacks clawbacks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clawbacks
    ADD CONSTRAINT clawbacks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: communication_log communication_log_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communication_log
    ADD CONSTRAINT communication_log_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: communication_log communication_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communication_log
    ADD CONSTRAINT communication_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: company_fields company_fields_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_fields
    ADD CONSTRAINT company_fields_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: company_fields company_fields_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_fields
    ADD CONSTRAINT company_fields_field_id_fkey FOREIGN KEY (field_id) REFERENCES public.fields(id);


--
-- Name: customers customers_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: invoice_items invoice_items_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.team_leader_invoices(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payment_statements payment_statements_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_statements
    ADD CONSTRAINT payment_statements_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id);


--
-- Name: payment_statements payment_statements_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_statements
    ADD CONSTRAINT payment_statements_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id);


--
-- Name: reminders reminders_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id);


--
-- Name: reminders reminders_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id);


--
-- Name: statement_items statement_items_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statement_items
    ADD CONSTRAINT statement_items_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id);


--
-- Name: statement_items statement_items_statement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statement_items
    ADD CONSTRAINT statement_items_statement_id_fkey FOREIGN KEY (statement_id) REFERENCES public.payment_statements(id);


--
-- Name: team_leader_billing_settings team_leader_billing_settings_team_leader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_leader_billing_settings
    ADD CONSTRAINT team_leader_billing_settings_team_leader_id_fkey FOREIGN KEY (team_leader_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_leader_invoices team_leader_invoices_team_leader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_leader_invoices
    ADD CONSTRAINT team_leader_invoices_team_leader_id_fkey FOREIGN KEY (team_leader_id) REFERENCES public.users(id);


--
-- Name: user_agreements user_agreements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_agreements
    ADD CONSTRAINT user_agreements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_commissions user_commissions_associate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_commissions
    ADD CONSTRAINT user_commissions_associate_id_fkey FOREIGN KEY (associate_id) REFERENCES public.users(id);


--
-- Name: user_commissions user_commissions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_commissions
    ADD CONSTRAINT user_commissions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: user_field_commissions user_field_commissions_associate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_field_commissions
    ADD CONSTRAINT user_field_commissions_associate_id_fkey FOREIGN KEY (associate_id) REFERENCES public.users(id);


--
-- Name: user_field_commissions user_field_commissions_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_field_commissions
    ADD CONSTRAINT user_field_commissions_field_id_fkey FOREIGN KEY (field_id) REFERENCES public.fields(id);


--
-- Name: users users_parent_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_parent_user_id_fkey FOREIGN KEY (parent_user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict LSxtaB1nB6Q7BLquFsDCQ9sERAGmz8qZnWxjtIbaiMzJOpKZFmJ26JUrsFBbOKn

