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
-- Data for Name: department; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.department VALUES (1, 'IT');
INSERT INTO public.department VALUES (2, 'Finance');
INSERT INTO public.department VALUES (3, 'Member Services');
INSERT INTO public.department VALUES (4, 'Human Resources');


--
-- Data for Name: device_model; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.device_model VALUES (1, 'Dell', 'Latitude 5450');
INSERT INTO public.device_model VALUES (2, 'Dell', 'OptiPlex 7020');
INSERT INTO public.device_model VALUES (3, 'Lenovo', 'ThinkPad T14 Gen 5');
INSERT INTO public.device_model VALUES (4, 'HP', 'EliteBook 840 G11');


--
-- Data for Name: member_centre; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.member_centre VALUES (1, 'Langley Centre', 'LAN', 'Langley', 'BC', true, '2026-11-26 01:18:19.490511');
INSERT INTO public.member_centre VALUES (2, 'Calgary Centre', 'CGY', 'Calgary', 'AB', true, '2026-11-26 01:18:19.490511');
INSERT INTO public.member_centre VALUES (3, 'Winnipeg Centre', 'WPG', 'Winnipeg', 'MB', true, '2026-11-26 01:18:19.490511');


--
-- Data for Name: workstation; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.workstation VALUES ('ABC1235', 'LAN-DT-002', 1, 2, 2, 'PO-1001', 'Sam Patel', 'Active', 'Desk 12', '2024-03-02', '2026-11-24 09:02:00', 'Windows 11 23H2', '2026-11-26 01:18:19.490511', '2026-11-26 01:18:19.490511');
INSERT INTO public.workstation VALUES ('DEF5678', 'CGY-LT-001', 2, 3, 3, 'PO-1042', 'Alex Morgan', 'Active', 'Remote', '2025-01-10', '2026-11-18 14:45:00', 'Windows 11 24H2', '2026-11-26 01:18:19.490511', '2026-11-26 01:18:19.490511');
INSERT INTO public.workstation VALUES ('GHI9012', 'WPG-LT-001', 3, 4, 4, 'PO-0987', 'Riley Chen', 'Needs Review', 'Office 3', '2022-06-20', '2026-08-01 10:15:00', 'Windows 10 22H2', '2026-11-26 01:18:19.490511', '2026-11-26 01:18:19.490511');
INSERT INTO public.workstation VALUES ('DEF5679', 'CGY-LT-002', 2, NULL, 3, 'PO-1042', NULL, 'Spare', 'Storage', '2025-01-10', NULL, 'Windows 11 24H2', '2026-11-26 01:18:19.490511', '2026-11-26 01:18:19.490511');
INSERT INTO public.workstation VALUES ('GHI9013', NULL, 3, NULL, 1, 'PO-0750', NULL, 'Retired', NULL, '2020-02-11', '2024-12-01 16:20:00', 'Windows 10 22H2', '2026-11-26 01:18:19.490511', '2026-11-26 01:18:19.490511');
INSERT INTO public.workstation VALUES ('ABC1234', 'LAN-LT-001A', 1, 1, 1, 'PO-1001', 'Taylor Brooks', 'Active', 'Office 101', '2025-09-15', '2026-11-20 08:31:00', 'Windows 11 24H2', '2026-11-26 01:18:19.490511', '2026-11-26 01:18:19.490511');


--
-- Data for Name: replacement_exception; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.replacement_exception VALUES (1, 'GHI9012', 'Runs legacy accounting software; keep until vendor upgrade.', 'IT Admin', '2026-10-05');


--
-- Data for Name: warranty; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.warranty VALUES (1, 'ABC1234', '2028-09-01', '2029-09-01', false);
INSERT INTO public.warranty VALUES (2, 'ABC1235', '2027-02-15', '2028-02-15', false);
INSERT INTO public.warranty VALUES (3, 'DEF5678', '2027-12-31', '2028-12-31', false);
INSERT INTO public.warranty VALUES (4, 'DEF5679', '2027-12-31', '2028-12-31', false);
INSERT INTO public.warranty VALUES (5, 'GHI9012', '2025-06-01', '2026-06-01', true);
INSERT INTO public.warranty VALUES (6, 'GHI9013', '2023-02-01', '2024-02-01', false);


--
-- Data for Name: workstation_history; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.workstation_history VALUES (1, 'ABC1234', 'LAN-LT-001', 'Jordan Lee', 'Active', 'Office 101', 'seed-script', '2026-11-26 01:18:19.490511');


--
-- Name: department_department_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.department_department_id_seq', 4, true);


--
-- Name: device_model_model_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.device_model_model_id_seq', 4, true);


--
-- Name: member_centre_centre_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.member_centre_centre_id_seq', 3, true);


--
-- Name: replacement_exception_exception_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.replacement_exception_exception_id_seq', 1, true);


--
-- Name: warranty_warranty_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.warranty_warranty_id_seq', 6, true);


--
-- Name: workstation_history_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.workstation_history_history_id_seq', 1, true);


--
-- PostgreSQL database dump complete
--


