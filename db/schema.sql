--
-- PostgreSQL database dump
--


-- Dumped from database version 17.12 (Debian 17.12-0+deb13u1)
-- Dumped by pg_dump version 17.12

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: fn_log_workstation_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_log_workstation_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (OLD.workstation_name IS DISTINCT FROM NEW.workstation_name
        OR OLD.primary_user  IS DISTINCT FROM NEW.primary_user
        OR OLD.status        IS DISTINCT FROM NEW.status
        OR OLD.work_location IS DISTINCT FROM NEW.work_location) THEN
        INSERT INTO workstation_history (
            service_tag, previous_workstation_name, previous_user,
            previous_status, previous_location, changed_by
        ) VALUES (
            NEW.service_tag, OLD.workstation_name, OLD.primary_user,
            OLD.status, OLD.work_location,
            COALESCE(NULLIF(current_setting('app.user_name', true), ''), session_user)
        );
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: fn_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: department; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.department (
    department_id integer NOT NULL,
    department_name character varying(50) NOT NULL
);


--
-- Name: department_department_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.department_department_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: department_department_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.department_department_id_seq OWNED BY public.department.department_id;


--
-- Name: device_model; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_model (
    model_id integer NOT NULL,
    manufacturer character varying(50) NOT NULL,
    model_name character varying(50) NOT NULL
);


--
-- Name: device_model_model_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.device_model_model_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: device_model_model_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.device_model_model_id_seq OWNED BY public.device_model.model_id;


--
-- Name: member_centre; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_centre (
    centre_id integer NOT NULL,
    centre_name character varying(50) NOT NULL,
    site_code character varying(10) NOT NULL,
    city character varying(100),
    province_state character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: member_centre_centre_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.member_centre_centre_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: member_centre_centre_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.member_centre_centre_id_seq OWNED BY public.member_centre.centre_id;


--
-- Name: replacement_exception; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.replacement_exception (
    exception_id integer NOT NULL,
    service_tag character varying(50) NOT NULL,
    reason text NOT NULL,
    added_by character varying(100),
    date_flagged date DEFAULT CURRENT_DATE NOT NULL
);


--
-- Name: replacement_exception_exception_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.replacement_exception_exception_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: replacement_exception_exception_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.replacement_exception_exception_id_seq OWNED BY public.replacement_exception.exception_id;


--
-- Name: warranty; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warranty (
    warranty_id integer NOT NULL,
    service_tag character varying(50) NOT NULL,
    warranty_expiry date,
    eligible_replace_date date,
    is_manually_populated boolean DEFAULT false NOT NULL
);


--
-- Name: warranty_warranty_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.warranty_warranty_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: warranty_warranty_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.warranty_warranty_id_seq OWNED BY public.warranty.warranty_id;


--
-- Name: workstation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workstation (
    service_tag character varying(50) NOT NULL,
    workstation_name character varying(50),
    centre_id integer NOT NULL,
    department_id integer,
    model_id integer,
    po_number character varying(50),
    primary_user character varying(100),
    status character varying(30) DEFAULT 'Active'::character varying NOT NULL,
    work_location character varying(30),
    last_imaged_date date,
    last_login_date timestamp without time zone,
    os_version character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_service_tag_not_blank CHECK ((btrim((service_tag)::text) <> ''::text)),
    CONSTRAINT chk_workstation_status CHECK (((status)::text = ANY ((ARRAY['Active'::character varying, 'Spare'::character varying, 'Needs Review'::character varying, 'Retired'::character varying])::text[])))
);


--
-- Name: workstation_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workstation_history (
    history_id integer NOT NULL,
    service_tag character varying(50) NOT NULL,
    previous_workstation_name character varying(50),
    previous_user character varying(100),
    previous_status character varying(30),
    previous_location character varying(30),
    changed_by character varying(100),
    change_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: workstation_history_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workstation_history_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workstation_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workstation_history_history_id_seq OWNED BY public.workstation_history.history_id;


--
-- Name: department department_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department ALTER COLUMN department_id SET DEFAULT nextval('public.department_department_id_seq'::regclass);


--
-- Name: device_model model_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_model ALTER COLUMN model_id SET DEFAULT nextval('public.device_model_model_id_seq'::regclass);


--
-- Name: member_centre centre_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_centre ALTER COLUMN centre_id SET DEFAULT nextval('public.member_centre_centre_id_seq'::regclass);


--
-- Name: replacement_exception exception_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.replacement_exception ALTER COLUMN exception_id SET DEFAULT nextval('public.replacement_exception_exception_id_seq'::regclass);


--
-- Name: warranty warranty_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warranty ALTER COLUMN warranty_id SET DEFAULT nextval('public.warranty_warranty_id_seq'::regclass);


--
-- Name: workstation_history history_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workstation_history ALTER COLUMN history_id SET DEFAULT nextval('public.workstation_history_history_id_seq'::regclass);


--
-- Name: department department_department_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department
    ADD CONSTRAINT department_department_name_key UNIQUE (department_name);


--
-- Name: department department_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department
    ADD CONSTRAINT department_pkey PRIMARY KEY (department_id);


--
-- Name: device_model device_model_model_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_model
    ADD CONSTRAINT device_model_model_name_key UNIQUE (model_name);


--
-- Name: device_model device_model_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_model
    ADD CONSTRAINT device_model_pkey PRIMARY KEY (model_id);


--
-- Name: member_centre member_centre_centre_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_centre
    ADD CONSTRAINT member_centre_centre_name_key UNIQUE (centre_name);


--
-- Name: member_centre member_centre_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_centre
    ADD CONSTRAINT member_centre_pkey PRIMARY KEY (centre_id);


--
-- Name: member_centre member_centre_site_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_centre
    ADD CONSTRAINT member_centre_site_code_key UNIQUE (site_code);


--
-- Name: replacement_exception replacement_exception_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.replacement_exception
    ADD CONSTRAINT replacement_exception_pkey PRIMARY KEY (exception_id);


--
-- Name: replacement_exception replacement_exception_service_tag_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.replacement_exception
    ADD CONSTRAINT replacement_exception_service_tag_key UNIQUE (service_tag);


--
-- Name: warranty warranty_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warranty
    ADD CONSTRAINT warranty_pkey PRIMARY KEY (warranty_id);


--
-- Name: warranty warranty_service_tag_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warranty
    ADD CONSTRAINT warranty_service_tag_key UNIQUE (service_tag);


--
-- Name: workstation_history workstation_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workstation_history
    ADD CONSTRAINT workstation_history_pkey PRIMARY KEY (history_id);


--
-- Name: workstation workstation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workstation
    ADD CONSTRAINT workstation_pkey PRIMARY KEY (service_tag);


--
-- Name: workstation workstation_workstation_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workstation
    ADD CONSTRAINT workstation_workstation_name_key UNIQUE (workstation_name);


--
-- Name: idx_history_service_tag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_history_service_tag ON public.workstation_history USING btree (service_tag, change_timestamp DESC);


--
-- Name: idx_warranty_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_warranty_expiry ON public.warranty USING btree (warranty_expiry);


--
-- Name: idx_warranty_replace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_warranty_replace ON public.warranty USING btree (eligible_replace_date);


--
-- Name: idx_workstation_centre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workstation_centre ON public.workstation USING btree (centre_id);


--
-- Name: idx_workstation_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workstation_department ON public.workstation USING btree (department_id);


--
-- Name: idx_workstation_model; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workstation_model ON public.workstation USING btree (model_id);


--
-- Name: idx_workstation_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workstation_status ON public.workstation USING btree (status);


--
-- Name: idx_workstation_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workstation_user ON public.workstation USING btree (lower((primary_user)::text));


--
-- Name: workstation trg_workstation_history; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_workstation_history AFTER UPDATE ON public.workstation FOR EACH ROW EXECUTE FUNCTION public.fn_log_workstation_change();


--
-- Name: workstation trg_workstation_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_workstation_updated_at BEFORE UPDATE ON public.workstation FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: replacement_exception fk_exception_workstation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.replacement_exception
    ADD CONSTRAINT fk_exception_workstation FOREIGN KEY (service_tag) REFERENCES public.workstation(service_tag) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: workstation_history fk_history_workstation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workstation_history
    ADD CONSTRAINT fk_history_workstation FOREIGN KEY (service_tag) REFERENCES public.workstation(service_tag) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: warranty fk_warranty_workstation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warranty
    ADD CONSTRAINT fk_warranty_workstation FOREIGN KEY (service_tag) REFERENCES public.workstation(service_tag) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: workstation fk_workstation_centre; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workstation
    ADD CONSTRAINT fk_workstation_centre FOREIGN KEY (centre_id) REFERENCES public.member_centre(centre_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: workstation fk_workstation_department; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workstation
    ADD CONSTRAINT fk_workstation_department FOREIGN KEY (department_id) REFERENCES public.department(department_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: workstation fk_workstation_model; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workstation
    ADD CONSTRAINT fk_workstation_model FOREIGN KEY (model_id) REFERENCES public.device_model(model_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--


