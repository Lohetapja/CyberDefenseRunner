// questions.js — 40 questions, 4 per topic
// correct: index 0-3 pointing to the correct option
// Distribution: 10 correct at index 0, 10 at 1, 10 at 2, 10 at 3

const QUESTIONS = [

  // ── NETWORKING ────────────────────────────────────────────────────────────

  {
    id: "net-001",
    tier: "Beginner",
    topic: "Networking",
    prompt: "What is the primary function of a default gateway on a local network?",
    options: [
      "It routes traffic from the local network to other networks, including the internet",
      "It assigns IP addresses to devices using DHCP",
      "It resolves domain names to IP addresses",
      "It filters malicious traffic between network segments"
    ],
    correct: 0,
    explain: "The default gateway is the router that your device sends traffic to when the destination is outside your local subnet. Without it, your device can talk to local hosts but cannot reach the internet or other networks.",
    reward: "Network Segmentation"
  },

  {
    id: "net-002",
    tier: "Beginner",
    topic: "Networking",
    prompt: "Which OSI layer is responsible for logical IP addressing and routing packets between networks?",
    options: [
      "Layer 1 – Physical",
      "Layer 2 – Data Link",
      "Layer 3 – Network",
      "Layer 4 – Transport"
    ],
    correct: 2,
    explain: "Layer 3 (Network) handles IP addresses and packet routing. Layer 2 uses MAC addresses for local delivery. Layer 4 handles ports and whether the connection is TCP or UDP.",
    reward: "Packet Inspection"
  },

  {
    id: "net-003",
    tier: "Intermediate",
    topic: "Networking",
    prompt: "What happens to an IP packet when its TTL (Time to Live) value reaches zero?",
    options: [
      "The packet is re-routed to an alternate path automatically",
      "The router discards the packet and sends an ICMP Time Exceeded message back to the sender",
      "The packet is queued and retransmitted after a delay",
      "The destination host sends a reset to close the connection"
    ],
    correct: 1,
    explain: "Every router that forwards a packet decrements the TTL by 1. When TTL hits 0, the router drops the packet and sends ICMP Type 11 (Time Exceeded) back to the sender. This prevents packets from looping forever. The tool 'traceroute' exploits this behavior to map network paths.",
    reward: "Packet Inspection"
  },

  {
    id: "net-004",
    tier: "Intermediate",
    topic: "Networking",
    prompt: "What is the key operational difference between TCP and UDP?",
    options: [
      "TCP uses IP addresses; UDP uses MAC addresses for delivery",
      "UDP is encrypted by default; TCP sends data in plaintext",
      "TCP is only used inside private networks; UDP works across the internet",
      "TCP guarantees ordered, reliable delivery using acknowledgments; UDP sends data with no delivery confirmation"
    ],
    correct: 3,
    explain: "TCP establishes a connection with a three-way handshake and retransmits lost packets, making it reliable but slower. UDP sends data without handshakes or acknowledgments — ideal for DNS, video streaming, and VoIP where speed matters more than guaranteed delivery.",
    reward: "Network Segmentation"
  },

  // ── PORTS ────────────────────────────────────────────────────────────────

  {
    id: "ports-001",
    tier: "Beginner",
    topic: "Ports",
    prompt: "Which port does SSH (Secure Shell) use by default for encrypted remote access?",
    options: [
      "Port 21",
      "Port 22",
      "Port 23",
      "Port 3389"
    ],
    correct: 1,
    explain: "SSH uses port 22 for encrypted remote terminal access. Port 21 is FTP, port 23 is Telnet (unencrypted — a security risk), and port 3389 is RDP. Knowing these defaults helps you spot unexpected connections in logs.",
    reward: "Port Awareness"
  },

  {
    id: "ports-002",
    tier: "Beginner",
    topic: "Ports",
    prompt: "Which port does HTTPS use for encrypted web traffic?",
    options: [
      "Port 80",
      "Port 8080",
      "Port 443",
      "Port 8443"
    ],
    correct: 2,
    explain: "HTTPS uses port 443. Port 80 is plain HTTP (unencrypted). Ports 8080 and 8443 are common development or proxy alternatives. Analysts should watch for unencrypted HTTP on port 80 carrying sensitive data.",
    reward: "Port Awareness"
  },

  {
    id: "ports-003",
    tier: "Intermediate",
    topic: "Ports",
    prompt: "A SOC analyst sees frequent outbound connections from a workstation to an external IP on port 4444. What is the most likely concern?",
    options: [
      "A reverse shell or remote access trojan using Metasploit's default listener port",
      "Normal HTTPS traffic to a cloud service",
      "A Windows Update downloading patches",
      "A DNS query being sent to a resolver"
    ],
    correct: 0,
    explain: "Port 4444 is the default listener port for Metasploit's Meterpreter reverse shell. Seeing outbound connections from a workstation to an unknown external IP on this port is a strong indicator of compromise and should trigger an immediate investigation.",
    reward: "Firewall Hardening"
  },

  {
    id: "ports-004",
    tier: "Intermediate",
    topic: "Ports",
    prompt: "Which port does SMB (Server Message Block) use, and why does it matter to defenders?",
    options: [
      "Port 25 — used for email relay and spam attacks",
      "Port 53 — used for DNS-based exfiltration attacks",
      "Port 3389 — used for RDP brute force attacks",
      "Port 445 — exploited by ransomware such as WannaCry via EternalBlue"
    ],
    correct: 3,
    explain: "SMB runs on port 445. The EternalBlue exploit (used by WannaCry and NotPetya) targeted this port to spread ransomware across networks automatically. Blocking unnecessary SMB traffic at the perimeter and between workstations is a key hardening step.",
    reward: "Firewall Hardening"
  },

  // ── DNS ──────────────────────────────────────────────────────────────────

  {
    id: "dns-001",
    tier: "Beginner",
    topic: "DNS",
    prompt: "Which DNS record type maps a hostname to an IPv4 address?",
    options: [
      "A record",
      "MX record",
      "AAAA record",
      "CNAME record"
    ],
    correct: 0,
    explain: "An A record maps a hostname (e.g., example.com) to an IPv4 address. AAAA maps to IPv6. MX records direct email. CNAME records create aliases pointing to another hostname.",
    reward: "DNS Filtering"
  },

  {
    id: "dns-002",
    tier: "Beginner",
    topic: "DNS",
    prompt: "What does DNS stand for, and what problem does it solve?",
    options: [
      "Dynamic Network Service — it dynamically assigns IPs to devices",
      "Distributed Node Server — it distributes load across servers",
      "Domain Name System — it translates human-readable names into IP addresses",
      "Data Naming Standard — it standardizes how files are named on servers"
    ],
    correct: 2,
    explain: "DNS (Domain Name System) is the internet's phone book. It translates domain names like 'google.com' into IP addresses like 142.250.80.46 so that computers can route traffic to the correct destination.",
    reward: "DNS Filtering"
  },

  {
    id: "dns-003",
    tier: "Intermediate",
    topic: "DNS",
    prompt: "An attacker is using DNS tunneling. What are they most likely doing?",
    options: [
      "Flooding a DNS server to cause a denial of service",
      "Poisoning the DNS cache to redirect users to fake websites",
      "Speeding up DNS lookups by caching responses locally",
      "Encoding C2 commands or stolen data inside DNS queries to bypass firewall controls"
    ],
    correct: 3,
    explain: "DNS tunneling encodes data inside DNS queries and responses. Because firewalls rarely block DNS traffic, attackers use it to exfiltrate data or communicate with C2 servers. Look for unusually long subdomains, high query rates, or queries to newly-registered domains.",
    reward: "Threat Intel Feed"
  },

  {
    id: "dns-004",
    tier: "Advanced",
    topic: "DNS",
    prompt: "What does a DNS sinkhole do in a defensive security operation?",
    options: [
      "It caches DNS responses to speed up resolution for internal users",
      "It redirects DNS lookups for known malicious domains to a controlled IP, blocking C2 communication and revealing infected hosts",
      "It encrypts all DNS traffic to prevent eavesdropping on queries",
      "It generates decoy DNS alerts to confuse attackers"
    ],
    correct: 1,
    explain: "A DNS sinkhole intercepts queries for known malicious domains (from threat intel feeds) and returns a controlled, harmless IP instead. This cuts off C2 communication and — critically — shows analysts which internal hosts are actively trying to reach attacker infrastructure.",
    reward: "DNS Filtering"
  },

  // ── FIREWALL ─────────────────────────────────────────────────────────────

  {
    id: "fw-001",
    tier: "Beginner",
    topic: "Firewall",
    prompt: "What is an implicit deny rule in a firewall policy?",
    options: [
      "A rule that logs all traffic without blocking any of it",
      "A rule that allows all traffic by default unless flagged as malicious",
      "A rule at the end of the policy that blocks all traffic not matched by an explicit allow rule",
      "A rule that only blocks inbound traffic from unknown sources"
    ],
    correct: 2,
    explain: "Implicit deny (deny-all by default) means that if no explicit allow rule matches a packet, the firewall drops it. This is the safest posture: you allow only what is needed and everything else is blocked. It is the opposite of the unsafe 'allow all' default.",
    reward: "Firewall Hardening"
  },

  {
    id: "fw-002",
    tier: "Beginner",
    topic: "Firewall",
    prompt: "How does the principle of least privilege apply to firewall rules?",
    options: [
      "Open only the specific ports and protocols actually required for business operations, and deny everything else",
      "Allow all traffic by default and log suspicious events for review later",
      "Grant all internal users the ability to modify firewall rules as needed",
      "Block only inbound traffic and allow all outbound traffic freely"
    ],
    correct: 0,
    explain: "Least privilege in firewall design means granting only the minimum necessary network access. Open a port only when there is a clear business need, and restrict it to the required source, destination, and direction. Unused open ports are unnecessary attack surface.",
    reward: "Firewall Hardening"
  },

  {
    id: "fw-003",
    tier: "Intermediate",
    topic: "Firewall",
    prompt: "What is the key difference between a stateful and a stateless firewall?",
    options: [
      "A stateful firewall is faster; a stateless firewall provides deeper inspection",
      "A stateful firewall tracks active connection state and allows return traffic automatically; a stateless firewall evaluates every packet independently against fixed rules",
      "A stateless firewall can decrypt and inspect TLS traffic; a stateful firewall cannot",
      "A stateful firewall only operates at Layer 2 on the local network"
    ],
    correct: 1,
    explain: "Stateful firewalls maintain a connection table and know whether a packet belongs to an established, allowed session — so they automatically permit return traffic. Stateless firewalls check each packet in isolation using header fields only, which requires explicit rules for both directions.",
    reward: "Firewall Hardening"
  },

  {
    id: "fw-004",
    tier: "Intermediate",
    topic: "Firewall",
    prompt: "A firewall permits all outbound traffic on port 443 from any internal host to any destination. An attacker uses HTTPS to exfiltrate sensitive data. What does this scenario demonstrate?",
    options: [
      "That HTTPS should be completely blocked to prevent data loss",
      "That the firewall vendor has a bug in their TLS inspection engine",
      "That the attacker must have compromised the firewall itself to bypass it",
      "That overly broad outbound rules allow attackers to abuse permitted ports to evade detection"
    ],
    correct: 3,
    explain: "Attackers deliberately use ports like 443 to blend with legitimate HTTPS traffic. A rule allowing any internal host to reach any external IP on 443 is often too permissive. Egress filtering (restricting destinations to known business IPs) and TLS inspection help detect this abuse.",
    reward: "Firewall Hardening"
  },

  // ── SUBNETTING ───────────────────────────────────────────────────────────

  {
    id: "sub-001",
    tier: "Beginner",
    topic: "Subnetting",
    prompt: "What does the /24 in the IP address 192.168.1.0/24 (CIDR notation) represent?",
    options: [
      "The network supports exactly 24 hosts",
      "The first 24 bits of the address are the network portion, leaving 8 bits for hosts",
      "The subnet contains 24 separate routers",
      "The address is the 24th available IP range on the internet"
    ],
    correct: 1,
    explain: "CIDR prefix /24 means the subnet mask has 24 consecutive 1-bits (255.255.255.0). The remaining 8 bits define host addresses, giving 256 total addresses (254 usable — the network and broadcast addresses are reserved).",
    reward: "Subnetting Clarity"
  },

  {
    id: "sub-002",
    tier: "Intermediate",
    topic: "Subnetting",
    prompt: "How many usable host IP addresses are available in a /30 subnet?",
    options: [
      "6 usable hosts",
      "4 usable hosts",
      "2 usable hosts",
      "8 usable hosts"
    ],
    correct: 2,
    explain: "A /30 subnet has 2 host bits, giving 2² = 4 total addresses. One is the network address and one is the broadcast address, leaving exactly 2 usable host addresses. /30 subnets are commonly used for point-to-point router links.",
    reward: "Subnetting Clarity"
  },

  {
    id: "sub-003",
    tier: "Beginner",
    topic: "Subnetting",
    prompt: "Which of the following IP address ranges is defined as private (non-routable on the public internet) by RFC 1918?",
    options: [
      "172.16.0.0/12",
      "8.8.8.0/24",
      "1.1.1.0/24",
      "198.51.100.0/24"
    ],
    correct: 0,
    explain: "RFC 1918 defines three private ranges: 10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16. These are not routed on the internet. 8.8.8.8 is Google DNS, 1.1.1.1 is Cloudflare DNS, and 198.51.100.0/24 is a documentation-only range (TEST-NET-2).",
    reward: "Network Segmentation"
  },

  {
    id: "sub-004",
    tier: "Intermediate",
    topic: "Subnetting",
    prompt: "Host A has IP 192.168.1.100/25 and Host B has IP 192.168.1.200/25. Can they communicate directly without a router?",
    options: [
      "Yes — they share the same first three octets, so they are on the same subnet",
      "Yes — both are RFC 1918 private addresses, so routing is not needed",
      "No — they are in different IP classes and need a gateway",
      "No — a /25 mask splits 192.168.1.0 into .0–.127 and .128–.255; Host A is in the first subnet, Host B is in the second"
    ],
    correct: 3,
    explain: "With a /25 mask (255.255.255.128), the last octet is split at 128. 192.168.1.0/25 covers .0–.127 and 192.168.1.128/25 covers .128–.255. Host A (.100) and Host B (.200) are in different subnets and require a router to communicate.",
    reward: "Subnetting Clarity"
  },

  // ── BLUE TEAM ────────────────────────────────────────────────────────────

  {
    id: "blue-001",
    tier: "Beginner",
    topic: "Blue Team",
    prompt: "In security monitoring, what is a false positive?",
    options: [
      "A confirmed attack that was successfully blocked by a security control",
      "An alert that correctly identifies real malicious activity",
      "A security tool that fails to generate any alerts at all",
      "An alert that fires on legitimate, benign activity and incorrectly flags it as a threat"
    ],
    correct: 3,
    explain: "A false positive is an alert for something that is not actually malicious — for example, a port scanner alert triggering on an internal vulnerability assessment. High false positive rates cause alert fatigue, where analysts start ignoring or auto-closing alerts, increasing the risk of missing real incidents.",
    reward: "SIEM Visibility"
  },

  {
    id: "blue-002",
    tier: "Beginner",
    topic: "Blue Team",
    prompt: "What does SIEM stand for, and what is its core purpose?",
    options: [
      "Security Information and Event Management — aggregates and analyzes logs to detect threats",
      "System Intrusion and Event Monitor — monitors individual endpoints for malware",
      "Secure IP Event Manager — manages firewall rules based on IP reputation",
      "Software Integration and Endpoint Management — pushes security patches to endpoints"
    ],
    correct: 0,
    explain: "A SIEM (Security Information and Event Management) system collects logs and events from firewalls, servers, endpoints, and applications, then correlates them to detect suspicious patterns. It is the central visibility platform for a SOC.",
    reward: "SIEM Visibility"
  },

  {
    id: "blue-003",
    tier: "Intermediate",
    topic: "Blue Team",
    prompt: "A SOC team receives 600 low-fidelity alerts per hour, nearly all of which turn out to be false positives. What is the primary operational risk?",
    options: [
      "The SIEM will run out of storage and stop collecting logs",
      "The network firewall will automatically block all traffic due to overload",
      "Alert fatigue — analysts become desensitized and miss real incidents buried in the noise",
      "All 600 alerts will be escalated to senior management automatically"
    ],
    correct: 2,
    explain: "Alert fatigue occurs when high volumes of low-quality alerts overwhelm analysts. They begin dismissing alerts without proper investigation, which is exactly when a real attacker can move undetected. The solution is better alert tuning, threat intelligence enrichment, and prioritization.",
    reward: "SOC Triage Skill"
  },

  {
    id: "blue-004",
    tier: "Intermediate",
    topic: "Blue Team",
    prompt: "What is the main security reason for having a log retention policy?",
    options: [
      "To delete logs quickly and reduce storage costs",
      "To preserve logs for a defined period so they are available for incident investigations and compliance requirements",
      "To restrict log access so only the CISO can review security events",
      "To automatically generate reports for auditors without analyst involvement"
    ],
    correct: 1,
    explain: "Log retention policies define how long logs are kept. Attackers often dwell in networks for weeks or months before discovery. Without sufficient retention (often 90 days to 1 year), investigators cannot reconstruct the timeline of a breach. Many regulations (PCI-DSS, HIPAA, SOC 2) mandate minimum retention periods.",
    reward: "Log Retention"
  },

  // ── RED TEAM ─────────────────────────────────────────────────────────────

  {
    id: "red-001",
    tier: "Beginner",
    topic: "Red Team",
    prompt: "In the context of a cyberattack, what is reconnaissance?",
    options: [
      "Gathering information about the target — open ports, employee names, technologies — before launching the attack",
      "Encrypting files on the victim's systems to deploy ransomware",
      "Installing a backdoor on a compromised host for persistent access",
      "Deleting logs on the victim's systems to erase evidence of the attack"
    ],
    correct: 0,
    explain: "Reconnaissance is the first stage of most attacks. Attackers collect data about the target using passive methods (OSINT, job postings, social media) and active methods (port scanning, service enumeration). The more they learn, the more targeted and effective their next steps can be.",
    reward: "Threat Intel Feed"
  },

  {
    id: "red-002",
    tier: "Intermediate",
    topic: "Red Team",
    prompt: "What is privilege escalation in an attack scenario?",
    options: [
      "Moving from one compromised host to other systems within the same internal network",
      "Exfiltrating sensitive data to an external server controlled by the attacker",
      "Using phishing to trick a user into revealing their credentials",
      "Gaining higher-level permissions than the initial access level granted — for example, moving from a standard user to a local administrator or domain admin"
    ],
    correct: 3,
    explain: "Privilege escalation is how attackers expand their power on a system. Starting with low-privilege access (e.g., a standard user account), they exploit misconfigurations, unpatched vulnerabilities, or weak credentials to gain administrator or SYSTEM-level access needed to achieve their objectives.",
    reward: "Incident Response Speed"
  },

  {
    id: "red-003",
    tier: "Intermediate",
    topic: "Red Team",
    prompt: "What is lateral movement in a cyberattack?",
    options: [
      "Exfiltrating data through an encrypted tunnel to an external server",
      "Moving from an initially compromised host to other systems within the same internal network to expand access",
      "Scanning the target's external perimeter for open ports and vulnerabilities",
      "Installing ransomware on the first host compromised during the attack"
    ],
    correct: 1,
    explain: "After gaining initial access, attackers pivot to other internal hosts — seeking domain controllers, file servers, or databases. Common techniques include pass-the-hash, stolen credentials, and exploiting trust relationships between hosts. Detecting lateral movement early limits the attacker's reach.",
    reward: "Threat Intel Feed"
  },

  {
    id: "red-004",
    tier: "Advanced",
    topic: "Red Team",
    prompt: "What is a living-off-the-land (LotL) attack, and why is it effective against traditional defenses?",
    options: [
      "An attack that targets critical infrastructure in the agriculture sector",
      "A phishing campaign that uses nature and farming themes to appear legitimate",
      "Using built-in, trusted operating system tools (such as PowerShell, WMI, or certutil) to perform malicious actions, blending in with normal admin activity",
      "A zero-day exploit that targets unpatched vulnerabilities in web servers"
    ],
    correct: 2,
    explain: "LotL attacks use tools already present on the system — PowerShell, WMI, PsExec, certutil, mshta — that are trusted by the OS and often whitelisted by security products. Because no malicious binary is dropped, signature-based antivirus and many EDR rules miss it. Behavioral analysis and command-line logging are key defenses.",
    reward: "EDR Coverage"
  },

  // ── SOC INVESTIGATION ────────────────────────────────────────────────────

  {
    id: "soc-001",
    tier: "Beginner",
    topic: "SOC Investigation",
    prompt: "What does IOC stand for, and how is it used in security investigations?",
    options: [
      "Internet Operations Center — the physical location where SOC analysts work",
      "Indicator of Compromise — a piece of evidence such as a malicious IP, hash, domain, or file path that suggests a system has been breached",
      "Intrusion Operations Command — the authority that authorizes penetration tests",
      "Internal Offense Catalog — a database of internal policy violations"
    ],
    correct: 1,
    explain: "An IOC (Indicator of Compromise) is forensic evidence of a potential intrusion. Common IOCs include malicious IP addresses, domain names, file hashes, registry keys, and user-agent strings. IOCs are shared via threat intelligence feeds so defenders can hunt for them across their environments.",
    reward: "SOC Triage Skill"
  },

  {
    id: "soc-002",
    tier: "Beginner",
    topic: "SOC Investigation",
    prompt: "When a SOC analyst receives a security alert, what should they do first?",
    options: [
      "Gather context about the alert — understand what asset is involved, what triggered it, and what surrounding activity looks like — before taking action",
      "Immediately isolate all potentially affected systems from the network",
      "Block the suspicious IP address at the firewall right away",
      "Escalate directly to the incident response team without reviewing the alert"
    ],
    correct: 0,
    explain: "Acting without context risks disrupting legitimate operations, missing related activity, or applying the wrong remediation. The first step is triage: understand the alert, check asset criticality, correlate with other events, and determine whether it is a true positive before escalating or taking containment action.",
    reward: "Incident Response Speed"
  },

  {
    id: "soc-003",
    tier: "Intermediate",
    topic: "SOC Investigation",
    prompt: "What is threat hunting in a SOC context?",
    options: [
      "Automatically responding to alerts generated by the SIEM",
      "Deploying new firewall rules based on recent vulnerability advisories",
      "Proactively searching for hidden threats that have evaded automated detection tools, using hypotheses and behavioral analysis",
      "Conducting penetration tests against internal systems to find vulnerabilities"
    ],
    correct: 2,
    explain: "Threat hunting assumes that attackers may already be in the environment, evading automated alerts. Hunters form hypotheses (e.g., 'is there evidence of credential dumping?') and query logs, endpoints, and network data to find anomalies. It is human-led and complements — not replaces — automated detection.",
    reward: "Threat Intel Feed"
  },

  {
    id: "soc-004",
    tier: "Advanced",
    topic: "SOC Investigation",
    prompt: "An analyst sees a Windows workstation making hundreds of DNS requests per hour to randomly-generated domain names, none of which resolve. What attack technique does this most strongly suggest?",
    options: [
      "A DNS amplification DDoS attack originating from this workstation",
      "A DNS cache poisoning attack targeting the internal DNS resolver",
      "Normal Windows Update behavior querying Microsoft domains",
      "A domain generation algorithm (DGA) used by malware to locate an active C2 server"
    ],
    correct: 3,
    explain: "DGA malware generates thousands of pseudo-random domain names algorithmically. The infected host queries them hoping one resolves to an active C2 server. Most fail (NX domain), which is the signature pattern. Analysts can detect this via high NXDOMAIN rates, random-looking subdomain patterns, and entropy analysis.",
    reward: "SIEM Visibility"
  },

  // ── MALWARE ──────────────────────────────────────────────────────────────

  {
    id: "mal-001",
    tier: "Beginner",
    topic: "Malware",
    prompt: "What does ransomware do to a victim's system?",
    options: [
      "It silently collects credentials and sends them to the attacker",
      "It slows down the system by consuming CPU for cryptocurrency mining",
      "It encrypts the victim's files and demands payment — usually cryptocurrency — in exchange for the decryption key",
      "It displays unwanted advertisements and redirects web traffic"
    ],
    correct: 2,
    explain: "Ransomware encrypts files and makes them inaccessible until a ransom is paid. Modern ransomware often also exfiltrates data before encrypting (double extortion), threatening to publish it if the victim does not pay. Offline backups that are not accessible from the infected network are the primary defense.",
    reward: "EDR Coverage"
  },

  {
    id: "mal-002",
    tier: "Beginner",
    topic: "Malware",
    prompt: "What is a Trojan horse in cybersecurity?",
    options: [
      "Malware that disguises itself as legitimate software to trick a user into executing it, while hiding malicious functionality inside",
      "A self-replicating worm that spreads automatically across network shares",
      "A virus that attaches itself to executable files and activates when those files are run",
      "A rootkit that hides malicious processes from the operating system"
    ],
    correct: 0,
    explain: "A Trojan appears useful or legitimate — a game, a utility, a fake software update — but contains hidden malicious code. Unlike viruses and worms, Trojans do not self-replicate. They rely on social engineering to get the user to run them. Common payloads include remote access tools, keyloggers, and downloaders.",
    reward: "EDR Coverage"
  },

  {
    id: "mal-003",
    tier: "Intermediate",
    topic: "Malware",
    prompt: "What is the defining characteristic of a rootkit?",
    options: [
      "It encrypts all files on a system and demands a ransom payment",
      "It spreads automatically across networks by exploiting unpatched vulnerabilities",
      "It sends spam email from the infected host using the victim's identity",
      "It modifies operating system components to hide its own presence, processes, files, and network connections from security tools and administrators"
    ],
    correct: 3,
    explain: "Rootkits achieve stealth by compromising the OS itself — hooking system calls, modifying kernel structures, or running in firmware — so that antivirus and monitoring tools cannot see the malicious activity. Detecting rootkits often requires booting from a clean external device or using specialized offline scanners.",
    reward: "Malware Analysis Skill"
  },

  {
    id: "mal-004",
    tier: "Intermediate",
    topic: "Malware",
    prompt: "An analyst finds a new process that added an entry to the Windows registry Run key. What security concern does this raise?",
    options: [
      "The process is consuming excessive CPU resources",
      "The process has established persistence — it will automatically execute every time a user logs in",
      "The registry key is encrypted and cannot be read by security tools",
      "The process is creating a network share visible to other hosts on the network"
    ],
    correct: 1,
    explain: "Registry Run keys (e.g., HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run) cause the listed program to launch at every user login. This is a common persistence mechanism for malware. Defenders should monitor for unexpected new Run key entries as part of endpoint detection.",
    reward: "Malware Analysis Skill"
  },

  // ── IDENTITY ─────────────────────────────────────────────────────────────

  {
    id: "id-001",
    tier: "Beginner",
    topic: "Identity",
    prompt: "What is multi-factor authentication (MFA)?",
    options: [
      "A method requiring two or more verification factors from different categories (something you know, have, or are) to authenticate",
      "Using two different passwords on the same account for added security",
      "Logging into the same account from two different approved devices simultaneously",
      "A password manager that generates unique passwords for each service"
    ],
    correct: 0,
    explain: "MFA combines factors from different categories: something you know (password), something you have (authenticator app, hardware token), and something you are (biometric). Even if an attacker steals a password, they cannot authenticate without the second factor. MFA blocks the vast majority of account compromise attacks.",
    reward: "MFA Shield"
  },

  {
    id: "id-002",
    tier: "Beginner",
    topic: "Identity",
    prompt: "What is a brute force attack against a user account?",
    options: [
      "Tricking a user into revealing their password through a deceptive email",
      "Stealing a valid session cookie after the user has already authenticated",
      "Systematically trying large numbers of password combinations until the correct one is found",
      "Exploiting a software vulnerability in the login page to bypass authentication entirely"
    ],
    correct: 2,
    explain: "In a brute force attack, the attacker tries many passwords — often using large wordlists or all character combinations — until they find the one that works. Defenses include account lockout after failed attempts, rate limiting, CAPTCHA, and using MFA so a correct password alone is not enough.",
    reward: "Identity Protection"
  },

  {
    id: "id-003",
    tier: "Intermediate",
    topic: "Identity",
    prompt: "What is 'impossible travel' as a detection concept in identity security?",
    options: [
      "A VPN connection that routes through multiple countries to obscure the user's real location",
      "Two successful authentications from geographically distant locations within a timeframe that is physically impossible to travel between",
      "An account that has permission to access resources across multiple geographic regions",
      "A user who authenticates simultaneously from multiple devices in the same location"
    ],
    correct: 1,
    explain: "Impossible travel detection flags account compromise: if a user logs in from London at 9:00 AM and from Tokyo at 9:15 AM, no human could have physically traveled that distance. This pattern strongly indicates stolen credentials or session hijacking. SIEM and identity platforms can alert on this automatically.",
    reward: "MFA Shield"
  },

  {
    id: "id-004",
    tier: "Advanced",
    topic: "Identity",
    prompt: "What is privilege creep, and why is it a security risk?",
    options: [
      "An attack technique where an adversary exploits a privilege escalation vulnerability to gain admin rights",
      "Granting users temporary elevated permissions during an incident response that are never revoked",
      "A social engineering technique used to convince admins to grant unnecessary access",
      "The gradual accumulation of access rights beyond what a user currently needs, typically due to role changes without removing old permissions"
    ],
    correct: 3,
    explain: "Privilege creep happens when users change roles or join projects and gain new permissions, but old permissions are never revoked. Over time, individuals accumulate far more access than their current job requires. This violates least privilege and increases the damage an attacker can do if that account is compromised. Periodic access reviews (recertification) are the standard mitigation.",
    reward: "Identity Protection"
  }

];
