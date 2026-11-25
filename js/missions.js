// Mission + quiz content for the SAA-C03 prep game. Plain ES module, no imports.

export const MISSIONS = [
  {
    id: 'global-static-site',
    title: 'Go Global, Stay Static',
    coach: 'Spot the words "static" and "no servers", then think about where content should live and how to get it close to visitors in 40 countries.',
    difficulty: 1,
    domain: 'High-Performing',
    brief: 'A startup launches a marketing site: HTML, CSS, JS and images (about 2 GB, no server-side code). Visitors come from 40 countries and must get fast page loads at www.example.com. Keep it simple: no servers to patch.',
    threat: null,
    palette: ['s3', 'cloudfront', 'route53', 'ec2', 'alb', 'asg', 'efs', 'ebs', 'globalaccelerator'],
    maxServices: 4,
    requirements: [
      {
        text: 'Host static files durably with no servers',
        anyOf: [['s3']],
        hint: 'Which storage serves objects over HTTP and is built for 11 nines of durability?',
        explain: 'S3 stores static assets with 99.999999999% durability and needs no servers. Static content plus "no servers" points to S3.'
      },
      {
        text: 'Low latency for users worldwide',
        anyOf: [['cloudfront']],
        hint: 'Cache copies close to users at edge locations.',
        explain: 'CloudFront caches content at hundreds of edge locations and can restrict bucket access via Origin Access Control. It also cuts S3 data transfer costs.'
      },
      {
        text: 'Serve the site on a custom domain',
        anyOf: [['route53']],
        hint: 'Something has to answer the DNS query for www.example.com.',
        explain: 'Route 53 alias records point a domain name at a CloudFront distribution, and alias queries to AWS resources are free.'
      }
    ],
    traps: [
      { service: 'ec2', text: 'Web servers for static files add patching and cost. S3 serves the files directly.' },
      { service: 'alb', text: 'A load balancer needs targets to route to. Static files need no compute.' },
      { service: 'asg', text: 'Scaling servers you do not need is pure overhead. S3 and CloudFront scale on their own.' },
      { service: 'efs', text: 'EFS is a shared file system that EC2 mounts. It cannot serve a website by itself.' },
      { service: 'ebs', text: 'An EBS volume attaches to a single instance in one AZ. It is not web hosting.' },
      { service: 'globalaccelerator', text: 'Global Accelerator speeds up TCP/UDP to endpoints but has no cache. For static HTTP content, CloudFront is the answer.' }
    ],
    lesson: 'Static website + global users = S3 origin behind CloudFront, with Route 53 alias for the domain.'
  },

  {
    id: 'ha-three-tier',
    title: 'Survive the AZ Outage',
    coach: '"Survive the loss of an AZ" and "automatic" are the keywords: every tier, web and database, needs a copy in a second AZ that takes over by itself.',
    difficulty: 1,
    domain: 'Resilient',
    brief: 'An e-commerce web app runs on one EC2 instance with a single-AZ RDS MySQL database. Last month an AZ failure took the site down for 3 hours. Redesign it to survive the loss of an AZ, with automatic recovery and no manual steps.',
    threat: 'outage',
    palette: ['alb', 'ec2', 'asg', 'rdsmultiaz', 'aurora', 'readreplica', 'nlb', 'rds', 'ebs', 'globalaccelerator'],
    maxServices: 5,
    requirements: [
      {
        text: 'Spread HTTP traffic across healthy instances in multiple AZs',
        anyOf: [['alb']],
        hint: 'You need a layer 7 entry point that runs health checks.',
        explain: 'An ALB spans AZs, health-checks its targets and routes only to healthy ones. For HTTP/HTTPS web apps, it is the default choice.'
      },
      {
        text: 'Web tier compute',
        anyOf: [['ec2']],
        hint: 'The app code still needs somewhere to run.',
        explain: 'The existing app runs on EC2 instances. They stay as the compute tier.'
      },
      {
        text: 'Replace failed instances automatically across AZs',
        anyOf: [['asg']],
        hint: 'What keeps a minimum number of instances running?',
        explain: 'An Auto Scaling group spread over 2+ AZs replaces unhealthy instances and keeps the desired capacity when an AZ fails.'
      },
      {
        text: 'Database fails over automatically if its AZ fails',
        anyOf: [['rdsmultiaz'], ['aurora']],
        hint: 'You need a synchronous standby and automatic failover, not just more copies to read from.',
        explain: 'RDS Multi-AZ keeps a synchronous standby in another AZ and fails over automatically, and the endpoint stays the same. Aurora also fails over automatically to a replica.'
      }
    ],
    traps: [
      { service: 'readreplica', text: 'RDS read replicas use asynchronous replication and are for scaling reads. Promotion is manual, so they do not give automatic HA.' },
      { service: 'rds', text: 'Single-AZ RDS is the single point of failure you are trying to remove.' },
      { service: 'nlb', text: 'NLB is layer 4, for TCP/UDP, extreme throughput or static IPs. For an HTTP web app, the exam expects an ALB.' },
      { service: 'ebs', text: 'An EBS volume lives in one AZ, so it does not make anything multi-AZ.' },
      { service: 'globalaccelerator', text: 'This is multi-AZ in one Region. Global Accelerator targets global/multi-Region traffic.' }
    ],
    lesson: 'High availability = ALB + Auto Scaling group across AZs + RDS Multi-AZ. Read replicas scale reads; they are not for HA.'
  },

  {
    id: 'secure-vpc-tiers',
    title: 'Build the Fortress VPC',
    coach: 'Trace each traffic path: internet to web tier, private servers out to patches, app to S3 that never leaves AWS, and web tier to database. Each path needs its own control.',
    difficulty: 1,
    domain: 'Secure',
    brief: 'A web app needs public web servers on HTTPS and a MySQL database that must never be reachable from the internet. Private servers must download OS patches, and the app reads S3 without traffic leaving the AWS network. Only the web tier may reach the database on port 3306.',
    threat: null,
    palette: ['igw', 'natgw', 'vpcendpoint', 'securitygroup', 'nacl', 'vpn', 'transitgateway', 'directconnect'],
    maxServices: 5,
    requirements: [
      {
        text: 'Internet route for the public web tier',
        anyOf: [['igw']],
        hint: 'A public subnet is defined by its route to one specific VPC component.',
        explain: 'An internet gateway with a 0.0.0.0/0 route makes a subnet public. Without it, nothing in the VPC is reachable from the internet.'
      },
      {
        text: 'Private instances download patches outbound only',
        anyOf: [['natgw']],
        hint: 'Let private instances start outbound connections, but never accept inbound ones.',
        explain: 'A NAT gateway in a public subnet gives private subnets outbound-only internet access. For HA, deploy one per AZ.'
      },
      {
        text: 'Reach S3 privately, no internet path',
        anyOf: [['vpcendpoint']],
        hint: 'S3 can be reached through a VPC route that never touches the internet.',
        explain: 'An S3 gateway endpoint adds a route-table target to S3 over the AWS network at no extra charge, and it skips NAT processing fees.'
      },
      {
        text: 'Database accepts 3306 only from the web tier',
        anyOf: [['securitygroup']],
        hint: 'Use a stateful firewall that can name another group as the source.',
        explain: 'A DB security group rule that references the web tier\'s security group allows exactly those instances, even as they scale.'
      }
    ],
    traps: [
      { service: 'nacl', text: 'NACLs are stateless, subnet-wide and match only CIDRs. "Only from the web tier" is a security group rule, and NACLs are just an optional extra layer.' },
      { service: 'vpn', text: 'Site-to-Site VPN connects an on-premises network, and nothing here is on premises.' },
      { service: 'transitgateway', text: 'Transit Gateway is a hub for many VPCs and sites. One VPC does not need it.' },
      { service: 'directconnect', text: 'A dedicated line to a data center does not help with patches or with S3 access.' }
    ],
    lesson: 'Public subnet = IGW route; private outbound = NAT gateway; private S3/DynamoDB = gateway endpoint; tier-to-tier = SG referencing SG.'
  },

  {
    id: 'ddos-sqli-shield',
    title: 'Hold the Line',
    coach: 'Split the brief into three threats: a flood (volume), a query-string attack (layer 7), and a business ask for experts and cost protection. Each one maps to a different layer.',
    difficulty: 2,
    domain: 'Secure',
    brief: 'A ticketing site behind a load balancer was hit by a 300 Gbps DDoS and by SQL injection attempts in query strings. The business wants attacks filtered before they reach the app, 24/7 access to AWS DDoS experts, and protection from scaling charges caused by an attack.',
    threat: 'ddos',
    palette: ['cloudfront', 'waf', 'shield', 'alb', 'nlb', 'cognito', 'kms', 'cloudtrail', 'iam'],
    maxServices: 5,
    requirements: [
      {
        text: 'Absorb traffic at the edge, far from the origin',
        anyOf: [['cloudfront']],
        hint: 'Use a globally distributed front door that soaks up traffic before it reaches your Region.',
        explain: 'CloudFront spreads traffic across many edge locations, absorbs volumetric attacks, and lets you attach WAF at the edge.'
      },
      {
        text: 'Block SQL injection with layer 7 rules',
        anyOf: [['waf']],
        hint: 'You need something that inspects HTTP requests.',
        explain: 'AWS WAF inspects HTTP requests and has managed SQL injection rule sets. It attaches to CloudFront, ALB and API Gateway.'
      },
      {
        text: 'DDoS experts on call 24/7 + cost protection',
        anyOf: [['shield']],
        hint: 'The free tier of this service is already on. The paid tier adds people and cost protection.',
        explain: 'Shield Standard is automatic and free. Shield Advanced adds 24/7 access to the AWS response team, detailed attack visibility and credits for attack-driven scaling costs.'
      },
      {
        text: 'Load-balance the HTTP origin fleet',
        anyOf: [['alb']],
        hint: 'Pick the load balancer that WAF can attach to.',
        explain: 'An ALB is a valid origin for CloudFront and supports WAF directly, so protection works at both edge and origin.'
      }
    ],
    traps: [
      { service: 'nlb', text: 'AWS WAF cannot attach to a Network Load Balancer, so SQL injection would go straight through.' },
      { service: 'cognito', text: 'Cognito handles user sign-in and does not filter malicious traffic.' },
      { service: 'kms', text: 'Encryption at rest does nothing against floods or injection attacks.' },
      { service: 'cloudtrail', text: 'CloudTrail logs API calls after the fact. It blocks nothing.' },
      { service: 'iam', text: 'IAM controls who can call AWS APIs, not which HTTP requests reach your app.' }
    ],
    lesson: 'SQL injection/XSS → WAF; DDoS + response team + cost protection → Shield Advanced; put CloudFront in front.'
  },

  {
    id: 'flash-sale-decouple',
    title: 'Flash Sale Frenzy',
    coach: '"Never dropped" plus "can lag a few minutes" is the exam signal to stop calling synchronously and put something durable between the tiers.',
    difficulty: 2,
    domain: 'Resilient',
    brief: 'During flash sales, orders jump from 200 to 2,000 per second for about 20 minutes. The order processor calls the backend synchronously, times out, and orders are lost. No order may ever be dropped, and processing can lag by a few minutes.',
    threat: 'spike',
    palette: ['sqs', 'lambda', 'ec2', 'asg', 'dynamodb', 'rdsmultiaz', 'sns', 'kinesis', 'eventbridge', 'elasticache'],
    maxServices: 4,
    requirements: [
      {
        text: 'Durably buffer every order until it is processed',
        anyOf: [['sqs']],
        hint: 'Workers should pull messages at their own pace.',
        explain: 'SQS stores messages durably (up to 14 days) until a consumer deletes them. It decouples producers from slower consumers, which is the classic answer for absorbing spikes.'
      },
      {
        text: 'Workers that scale with the queue backlog',
        anyOf: [['lambda'], ['asg', 'ec2']],
        hint: 'Either let the platform poll for you, or scale a fleet on queue depth.',
        explain: 'Lambda polls SQS and scales concurrency automatically. With EC2, an Auto Scaling group can scale on queue depth (backlog per instance).'
      },
      {
        text: 'Persist processed orders durably',
        anyOf: [['dynamodb'], ['rdsmultiaz']],
        hint: 'Orders need a durable database once processed.',
        explain: 'DynamoDB handles high write rates with no servers. RDS Multi-AZ also works if relational queries are needed.'
      }
    ],
    traps: [
      { service: 'sns', text: 'SNS pushes to subscribers and does not hold messages for workers to pull later. On its own it is not a buffer.' },
      { service: 'kinesis', text: 'Kinesis is for ordered, replayable streams that need shard planning. A simple work queue is SQS territory.' },
      { service: 'eventbridge', text: 'EventBridge routes events to targets. It is not a backlog that workers drain at their own pace.' },
      { service: 'elasticache', text: 'A cache is in-memory and not a durable record of orders.' }
    ],
    lesson: 'Spiky load + "no lost messages" + async OK → put SQS between tiers and scale consumers on queue depth.'
  },

  {
    id: 'containers-no-servers',
    title: 'Containers, Zero Nodes',
    coach: '"No Kubernetes", "no EC2 to patch" and "paths on one HTTPS endpoint" each narrow the choice: pick the simplest orchestrator, a serverless launch type and a layer 7 front door.',
    difficulty: 2,
    domain: 'High-Performing',
    brief: 'A team is splitting a monolith into 6 Docker microservices. Nobody on the team knows Kubernetes, and leadership wants no EC2 instances to patch or scale. All services must sit behind one HTTPS endpoint, routed by path (/orders, /users, ...).',
    threat: 'spike',
    palette: ['ecs', 'fargate', 'alb', 'eks', 'ec2', 'asg', 'beanstalk', 'nlb'],
    maxServices: 4,
    requirements: [
      {
        text: 'Orchestrate containers without Kubernetes',
        anyOf: [['ecs']],
        hint: 'Choose AWS\'s own, simpler container orchestrator.',
        explain: 'ECS is AWS-native container orchestration with no Kubernetes to learn, so it is the least-overhead choice when Kubernetes is not required.'
      },
      {
        text: 'No servers or nodes to manage',
        anyOf: [['fargate']],
        hint: 'Pick a launch type where AWS runs the underlying hosts.',
        explain: 'Fargate runs each task on AWS-managed compute, so there are no instances to patch, scale or right-size.'
      },
      {
        text: 'Route URL paths to services on one endpoint',
        anyOf: [['alb']],
        hint: 'Path routing happens at layer 7.',
        explain: 'ALB path-based rules send /orders and /users to separate target groups, and ECS registers tasks with them automatically.'
      }
    ],
    traps: [
      { service: 'eks', text: 'EKS runs Kubernetes, which the team does not know. ECS gives the same result with less to learn and run.' },
      { service: 'ec2', text: 'The ECS EC2 launch type means instances to patch and scale, which leadership ruled out.' },
      { service: 'asg', text: 'Fargate tasks scale with ECS Service Auto Scaling, so there are no EC2 Auto Scaling groups to manage.' },
      { service: 'beanstalk', text: 'Beanstalk can run Docker, but it launches EC2 instances in your account, which leadership wants to avoid.' },
      { service: 'nlb', text: 'NLB is layer 4 and cannot route by URL path.' }
    ],
    lesson: 'Containers + least ops + no Kubernetes → ECS on Fargate behind an ALB; existing Kubernetes → EKS.'
  },

  {
    id: 'serverless-signin-api',
    title: 'Zero Servers, Real Users',
    coach: '"Zero at night", "no servers" and "sign in with Google" each rule out a whole category. Pick pay-per-request building blocks and a service built for customer identity.',
    difficulty: 2,
    domain: 'Secure',
    brief: 'A mobile app needs a REST API whose traffic swings from zero at night to 5,000 requests/s at lunch. Users must sign up and sign in, including with Google. The team wants no servers to manage and only authenticated users calling the API.',
    threat: 'spike',
    palette: ['apigw', 'lambda', 'dynamodb', 'cognito', 'ec2', 'rds', 'iam', 'elasticache', 'secretsmanager'],
    maxServices: 5,
    requirements: [
      {
        text: 'Managed REST endpoint that validates user tokens',
        anyOf: [['apigw']],
        hint: 'A fully managed front door for APIs, with built-in authorizers and throttling.',
        explain: 'API Gateway provides REST endpoints, throttling and a Cognito user pool authorizer that rejects unauthenticated calls before your code runs.'
      },
      {
        text: 'Run business logic with no servers',
        anyOf: [['lambda']],
        hint: 'Pay per request, scale from zero.',
        explain: 'Lambda runs code per request, scales automatically and costs nothing when idle, which fits zero-to-peak traffic.'
      },
      {
        text: 'Serverless data store, single-digit ms at any scale',
        anyOf: [['dynamodb']],
        hint: 'Key-value, serverless, no connection pools.',
        explain: 'DynamoDB is serverless NoSQL with single-digit millisecond latency. On-demand mode handles unpredictable traffic without capacity planning.'
      },
      {
        text: 'User sign-up / sign-in incl. social login',
        anyOf: [['cognito']],
        hint: 'Identity for app end users, not for AWS staff.',
        explain: 'Cognito user pools handle sign-up, sign-in and federation with Google/Facebook/SAML, and issue JWTs that API Gateway can verify.'
      }
    ],
    traps: [
      { service: 'ec2', text: 'Instances must be patched and sized, and they cost money at zero traffic. The requirement is no servers.' },
      { service: 'rds', text: 'RDS is instance-based, and bursts of Lambda connections can exhaust it. DynamoDB fits serverless better.' },
      { service: 'iam', text: 'Never create IAM users for app end users. Cognito is built for customer identities.' },
      { service: 'elasticache', text: 'DynamoDB is already fast enough here, so a cache cluster adds cost and nodes to manage.' },
      { service: 'secretsmanager', text: 'Lambda reaches DynamoDB through its IAM execution role, so there are no database passwords to store.' }
    ],
    lesson: 'Serverless API = API Gateway + Lambda + DynamoDB; end-user auth = Cognito user pools, never IAM users.'
  },

  {
    id: 'order-workflow-ops',
    title: 'Orchestrate & Operate',
    coach: 'Three unrelated asks hide in this brief: coordinating steps with retries and rollback, a certificate that renews itself, and server access without SSH. Solve each one on its own.',
    difficulty: 2,
    domain: 'Resilient',
    brief: 'An order pipeline runs 5 Lambda functions (validate, charge, reserve stock, ship, notify), and the retry and rollback logic is tangled in code. Failed charges must retry with backoff, and a stock failure must trigger a refund. The public ALB needs a free TLS certificate that renews itself, and ops must patch the EC2 fleet behind it without opening port 22.',
    threat: 'outage',
    palette: ['stepfunctions', 'lambda', 'acm', 'ssm', 'sqs', 'amazonmq', 'eventbridge', 'cloudformation', 'kms'],
    maxServices: 5,
    requirements: [
      {
        text: 'Coordinate steps with retries, branching and compensation',
        anyOf: [['stepfunctions']],
        hint: 'Choose a managed state machine that tracks where each order is.',
        explain: 'Step Functions defines the workflow declaratively, with Retry/Catch and backoff per state. A Catch can route to a refund step, and every execution is visible.'
      },
      {
        text: 'Run each step\'s code',
        anyOf: [['lambda']],
        hint: 'The step code already exists. Keep it where it runs today.',
        explain: 'Each state invokes the existing Lambda function, so the business code stays small and the flow logic moves out of it.'
      },
      {
        text: 'Free, auto-renewing TLS certificate on the ALB',
        anyOf: [['acm']],
        hint: 'Pick the AWS service that issues and renews certificates.',
        explain: 'ACM public certificates are free for integrated services like ALB and CloudFront and renew automatically.'
      },
      {
        text: 'Patch and access instances without SSH',
        anyOf: [['ssm']],
        hint: 'An agent on the instance plus an IAM role can replace inbound access.',
        explain: 'Systems Manager Patch Manager patches fleets on a schedule, and Session Manager gives shell access with no open inbound ports or bastion.'
      }
    ],
    traps: [
      { service: 'sqs', text: 'Queues decouple steps but do not track workflow state, branching or compensation, so you would hand-code all of it.' },
      { service: 'amazonmq', text: 'Amazon MQ is a managed ActiveMQ/RabbitMQ broker for apps already using those protocols. It is not an orchestrator.' },
      { service: 'eventbridge', text: 'EventBridge routes events, but it does not hold per-order state through a multi-step flow with rollbacks.' },
      { service: 'cloudformation', text: 'CloudFormation provisions infrastructure. It does not patch running instances or run workflows.' },
      { service: 'kms', text: 'KMS manages encryption keys. TLS certificates for the ALB come from ACM.' }
    ],
    lesson: 'Multi-step workflows with retries/rollback → Step Functions; TLS certs → ACM; patching/shell without SSH → Systems Manager.'
  },

  {
    id: 'read-heavy-catalog',
    title: 'Too Many Reads',
    coach: '"90% reads" and "the same queries" are two separate hints: one points to keeping answers in memory, the other to adding copies that serve reads.',
    difficulty: 2,
    domain: 'High-Performing',
    brief: 'A product catalog on RDS MySQL serves 90% reads, and most are the same 1,000 popular product queries. Database CPU sits at 95% at peak and pages take 4 s to load. Cut read latency to milliseconds and offload the primary without rewriting the app for a new database engine.',
    threat: 'spike',
    palette: ['elasticache', 'readreplica', 'aurora', 'cloudwatch', 'rdsmultiaz', 'dynamodb', 'redshift', 'sqs', 'ebs'],
    maxServices: 4,
    requirements: [
      {
        text: 'Serve repeated hot queries from memory',
        anyOf: [['elasticache']],
        hint: 'The same queries keep hitting the database. Keep the results somewhere faster.',
        explain: 'ElastiCache (Redis/Memcached) caches query results in memory with sub-millisecond reads, removing repeated load from the database.'
      },
      {
        text: 'Add read capacity separate from the primary',
        anyOf: [['readreplica'], ['aurora']],
        hint: 'Send reads to copies of the database.',
        explain: 'RDS read replicas take read traffic off the primary. Aurora MySQL-compatible supports up to 15 low-lag replicas behind a reader endpoint.'
      },
      {
        text: 'Watch CPU and replica lag',
        anyOf: [['cloudwatch']],
        hint: 'You need metrics and alarms to see if the fix worked.',
        explain: 'RDS publishes CPUUtilization and ReplicaLag to CloudWatch, where alarms can warn before users notice.'
      }
    ],
    traps: [
      { service: 'rdsmultiaz', text: 'A Multi-AZ DB instance standby serves no reads. It exists for failover, not performance.' },
      { service: 'dynamodb', text: 'Moving to NoSQL means rewriting the app, which the brief rules out.' },
      { service: 'redshift', text: 'Redshift is an OLAP warehouse for analytics, not for serving low-latency app reads.' },
      { service: 'sqs', text: 'Page reads need synchronous answers, so queuing them makes users wait longer.' },
      { service: 'ebs', text: 'The bottleneck is CPU from repeated queries. Faster storage does not fix it.' }
    ],
    lesson: 'Read-heavy and repetitive → ElastiCache; read scaling → read replicas/Aurora replicas; Multi-AZ is for HA, not reads.'
  },

  {
    id: 'serverless-data-lake',
    title: 'SQL on the Lake',
    coach: '"Within minutes", "ad-hoc SQL", "pay per query" and "no clusters" mean every stage should be serverless: deliver, store, catalog, query.',
    difficulty: 2,
    domain: 'Cost-Optimized',
    brief: 'Web servers emit 500 GB/day of JSON clickstream events. Analysts want to run ad-hoc SQL on the data within minutes of arrival, a few times a week. Budget rules: no clusters, pay only when querying.',
    threat: null,
    palette: ['firehose', 's3', 'glue', 'athena', 'kinesis', 'redshift', 'emr', 'rds'],
    maxServices: 5,
    requirements: [
      {
        text: 'Deliver streaming events to storage with no consumer code',
        anyOf: [['firehose']],
        hint: 'Choose a fully managed delivery stream, not a stream you have to read yourself.',
        explain: 'Data Firehose buffers events and delivers them to S3 in near real time, and can convert JSON to Parquet. There are no consumers or shards to manage.'
      },
      {
        text: 'Cheap, durable storage for the data lake',
        anyOf: [['s3']],
        hint: 'Where do data lakes on AWS live?',
        explain: 'S3 is the standard data lake store: durable, cheap per GB, and readable directly by query engines.'
      },
      {
        text: 'Catalog schemas and run serverless ETL',
        anyOf: [['glue']],
        hint: 'Query engines need table definitions, and something should discover them.',
        explain: 'Glue crawlers infer schemas into the Glue Data Catalog, which Athena uses as its tables. Glue jobs run serverless Spark ETL.'
      },
      {
        text: 'Ad-hoc SQL on S3, billed per query',
        anyOf: [['athena']],
        hint: 'Use serverless SQL that reads files in place.',
        explain: 'Athena queries S3 directly with standard SQL and bills per data scanned. Parquet and partitioning cut that cost further.'
      }
    ],
    traps: [
      { service: 'kinesis', text: 'Data Streams needs consumers you build and run to land data in S3. Firehose delivers to S3 directly.' },
      { service: 'redshift', text: 'A warehouse suits heavy, frequent BI on loaded data. For occasional ad-hoc queries on S3, the exam answer is Athena.' },
      { service: 'emr', text: 'EMR runs big-data frameworks like Spark and Hadoop, which is far more to operate than ad-hoc SQL needs.' },
      { service: 'rds', text: 'An OLTP database is the wrong tool for 500 GB/day of append-only logs.' }
    ],
    lesson: 'Serverless analytics = Firehose → S3 → Glue Data Catalog → Athena; Redshift for heavy repeated BI, EMR for Spark/Hadoop.'
  },

  {
    id: 'hybrid-dx-vpn',
    title: 'The Private Highway',
    coach: '"Consistent performance, not the internet" decides the primary link. "Encrypted backup at the lowest cost" decides the second one, so do not pay twice for dedicated lines.',
    difficulty: 3,
    domain: 'Resilient',
    brief: 'A bank moves 5 TB per day between its data center and a VPC, and needs consistent, predictable network performance that does not ride the public internet. If the primary link fails, traffic must fail over to an encrypted backup path at the lowest possible cost.',
    threat: 'outage',
    palette: ['directconnect', 'vpn', 'cloudwatch', 'globalaccelerator', 'cloudfront', 'natgw', 'kms', 'route53'],
    maxServices: 4,
    requirements: [
      {
        text: 'Dedicated private link with consistent performance',
        anyOf: [['directconnect']],
        hint: 'You need a physical connection that bypasses the internet.',
        explain: 'Direct Connect is a dedicated private connection to AWS with consistent bandwidth and latency, which suits large, steady transfers.'
      },
      {
        text: 'Low-cost encrypted backup path',
        anyOf: [['vpn']],
        hint: 'Use a tunnel over the internet that can be set up quickly and cheaply.',
        explain: 'Site-to-Site VPN uses IPsec over the internet. It is the cost-effective encrypted backup for a Direct Connect link.'
      },
      {
        text: 'Alarm when the primary link goes down',
        anyOf: [['cloudwatch']],
        hint: 'Direct Connect publishes connection metrics somewhere.',
        explain: 'Direct Connect publishes metrics such as ConnectionState to CloudWatch, so alarms can tell ops when traffic shifts to the VPN.'
      }
    ],
    traps: [
      { service: 'globalaccelerator', text: 'Global Accelerator speeds up internet users\' traffic to AWS endpoints. It does not link a data center to a VPC.' },
      { service: 'cloudfront', text: 'A CDN caches content for end users and is not a hybrid network link.' },
      { service: 'natgw', text: 'NAT gateway gives private subnets outbound internet access, not a link to on-premises.' },
      { service: 'kms', text: 'KMS encrypts data with keys, not network paths. Traffic over Direct Connect is not encrypted by default; IPsec VPN is how you encrypt it.' },
      { service: 'route53', text: 'DNS resolves names but creates no network path.' }
    ],
    lesson: 'Consistent private bandwidth → Direct Connect; cheap encrypted backup → Site-to-Site VPN (DX alone is not encrypted).'
  },

  {
    id: 'dc-exit-migration',
    title: 'Data Center Exit',
    coach: 'Do the bandwidth math first: 80 TB over 100 Mbps takes more than 6 weeks. Then handle the live database and the Windows shares as separate problems.',
    difficulty: 3,
    domain: 'High-Performing',
    brief: 'A company must leave its data center in 6 weeks. It has 80 TB of file archives on a busy 100 Mbps link, and a production SQL Server database that must keep replicating changes until a cutover with minutes of downtime. Windows apps also need SMB shares with Active Directory permissions.',
    threat: 'outage',
    palette: ['snowball', 'dms', 'fsx', 's3', 'datasync', 'efs', 'storagegateway', 'directconnect'],
    maxServices: 5,
    requirements: [
      {
        text: 'Move 80 TB offline, faster than the network',
        anyOf: [['snowball']],
        hint: 'Do the bandwidth math. Sometimes the fastest network is a truck.',
        explain: 'Even at a full 100 Mbps, 80 TB takes about 74 days. Snowball devices ship the data and AWS loads it into S3.'
      },
      {
        text: 'Land the archives in durable storage',
        anyOf: [['s3']],
        hint: 'Where do Snowball imports end up?',
        explain: 'Snowball imports into S3 buckets. Lifecycle rules can later move cold archives to Glacier classes.'
      },
      {
        text: 'Replicate the live database until cutover',
        anyOf: [['dms']],
        hint: 'You need a full load first, then continuous change capture.',
        explain: 'DMS does a full load and then change data capture (CDC), so the source stays live and the cutover takes only minutes.'
      },
      {
        text: 'Windows SMB shares with AD and NTFS permissions',
        anyOf: [['fsx']],
        hint: 'Pick a managed file system built for Windows.',
        explain: 'FSx for Windows File Server provides native SMB, Active Directory integration and NTFS ACLs.'
      }
    ],
    traps: [
      { service: 'datasync', text: 'DataSync transfers online and is still capped by the slow, busy link: 80 TB will not fit in 6 weeks.' },
      { service: 'efs', text: 'EFS is NFS for Linux. It does not support Windows SMB shares or NTFS ACLs.' },
      { service: 'storagegateway', text: 'Storage Gateway gives hybrid access to cloud storage, but it still pushes data over the same slow link.' },
      { service: 'directconnect', text: 'A new Direct Connect can take weeks to provision and is costly for a one-time bulk move.' }
    ],
    lesson: 'Bulk data + slow link → Snowball; live DB with minimal downtime → DMS with CDC; Windows SMB → FSx for Windows.'
  },

  {
    id: 'compliance-audit',
    title: 'The Auditor Cometh',
    coach: 'Read it as an auditor\'s checklist: keys that rotate, passwords that rotate, and a record of every API call stored for years. Each line is a different service.',
    difficulty: 3,
    domain: 'Secure',
    brief: 'A healthcare app must pass an audit: data at rest encrypted with customer managed keys that rotate automatically, and database passwords rotated every 30 days with no app downtime. Every AWS API call must be recorded and the logs kept for 7 years.',
    threat: null,
    palette: ['kms', 'secretsmanager', 'cloudtrail', 's3', 'cloudwatch', 'cognito', 'iam', 'waf', 'shield'],
    maxServices: 5,
    requirements: [
      {
        text: 'Customer managed encryption keys with automatic rotation',
        anyOf: [['kms']],
        hint: 'You need a key service where you control key policies and rotation.',
        explain: 'KMS customer managed keys support automatic rotation and key policies, and every use is logged in CloudTrail.'
      },
      {
        text: 'Rotate DB credentials every 30 days automatically',
        anyOf: [['secretsmanager']],
        hint: 'Store the password somewhere that can change it on a schedule.',
        explain: 'Secrets Manager has built-in scheduled rotation for RDS credentials, and apps fetch the current secret at runtime. Parameter Store has no native rotation.'
      },
      {
        text: 'Record every AWS API call (who, what, when)',
        anyOf: [['cloudtrail']],
        hint: 'Which service records API activity in your account?',
        explain: 'CloudTrail records API calls made in the account. A trail delivers them continuously beyond the 90-day event history.'
      },
      {
        text: 'Retain audit logs for 7 years',
        anyOf: [['s3']],
        hint: 'Where does a trail deliver its log files?',
        explain: 'Trails deliver log files to an S3 bucket. Lifecycle rules and Object Lock can then retain them cheaply and immutably for years.'
      }
    ],
    traps: [
      { service: 'cloudwatch', text: 'CloudWatch covers metrics, logs and alarms. CloudTrail is the record of who called which API.' },
      { service: 'cognito', text: 'Cognito signs in app users and does not rotate database credentials.' },
      { service: 'iam', text: 'IAM controls access but neither encrypts data nor rotates DB passwords.' },
      { service: 'waf', text: 'WAF filters web requests, which no requirement here asks for.' },
      { service: 'shield', text: 'Shield protects against DDoS, which is unrelated to encryption or audit.' }
    ],
    lesson: 'Keys + rotation → KMS; secret rotation → Secrets Manager; API audit → CloudTrail delivering to S3.'
  },

  {
    id: 'multi-account-guardrails',
    title: 'Govern 40 Accounts',
    coach: 'Map each sentence to a control: preventive guardrails, workforce sign-in, threat detection, config compliance and audit. "Across 40 accounts" means think org-wide.',
    difficulty: 3,
    domain: 'Secure',
    brief: 'A company runs 40 AWS accounts. No account may disable audit logging or use unapproved Regions, not even its own admins. Staff need single sign-on to all accounts with corporate identities. Security wants alerts for compromised credentials or crypto-mining, and flags on resources that break rules like "EBS must be encrypted".',
    threat: null,
    palette: ['organizations', 'identitycenter', 'guardduty', 'config', 'cloudtrail', 'inspector', 'macie', 'iam', 'trustedadvisor', 'cognito'],
    maxServices: 6,
    requirements: [
      {
        text: 'Guardrails even account admins cannot bypass',
        anyOf: [['organizations']],
        hint: 'Restrict permissions from above the account, at OU level.',
        explain: 'Organizations service control policies (SCPs) set the maximum permissions in member accounts. A deny for unapproved Regions or for cloudtrail:StopLogging applies to every user and role there.'
      },
      {
        text: 'Workforce single sign-on to all accounts',
        anyOf: [['identitycenter']],
        hint: 'Pick the service for employees, not for app customers.',
        explain: 'IAM Identity Center connects to your corporate IdP and gives employees SSO into many accounts through permission sets.'
      },
      {
        text: 'Detect compromised credentials and crypto-mining',
        anyOf: [['guardduty']],
        hint: 'You need ML-based threat detection over account activity and network logs.',
        explain: 'GuardDuty analyzes CloudTrail, VPC Flow Logs and DNS logs to find threats such as credential misuse and crypto-mining, and can be enabled org-wide.'
      },
      {
        text: 'Flag non-compliant resource configurations',
        anyOf: [['config']],
        hint: 'Evaluate resource settings against rules continuously.',
        explain: 'AWS Config records resource configuration history and evaluates rules such as encrypted-volumes. Conformance packs can roll out across the org.'
      },
      {
        text: 'Record API activity in every account',
        anyOf: [['cloudtrail']],
        hint: 'One trail can cover the whole organization.',
        explain: 'An organization trail in CloudTrail logs API calls from all member accounts to a central S3 bucket.'
      }
    ],
    traps: [
      { service: 'inspector', text: 'Inspector scans EC2, container images and Lambda for software vulnerabilities. It does not detect credential misuse.' },
      { service: 'macie', text: 'Macie discovers sensitive data such as PII in S3, which is not asked for here.' },
      { service: 'iam', text: 'IAM users in 40 accounts means 40 sets of credentials. Workforce SSO is Identity Center.' },
      { service: 'trustedadvisor', text: 'Trusted Advisor gives best-practice recommendations. It neither enforces guardrails nor detects threats.' },
      { service: 'cognito', text: 'Cognito is for customer identities in your apps, not employee access to AWS accounts.' }
    ],
    lesson: 'Prevent → SCPs; workforce SSO → Identity Center; threats → GuardDuty; config compliance → Config; who-did-what → CloudTrail.'
  },

  {
    id: 'log-archive-patching',
    title: 'Cold Storage, Hot Savings',
    coach: 'Two separate problems: "almost never read, 48 hours is fine" means go as cold and cheap as possible, and "private subnets, outbound only" is a networking question.',
    difficulty: 3,
    domain: 'Cost-Optimized',
    brief: 'Servers produce 2 TB of logs per month. Logs are queried for 30 days, then must be kept 7 years and are almost never read, and retrieval within 48 hours is fine. The EC2 instances sit in private subnets and must download OS patches from the internet without being reachable from it.',
    threat: null,
    palette: ['s3', 'glacier', 'natgw', 'ebs', 'efs', 'vpn', 'directconnect', 'redshift'],
    maxServices: 4,
    requirements: [
      {
        text: 'Land logs in cheap, durable object storage',
        anyOf: [['s3']],
        hint: 'Store objects durably at a low price per GB, with lifecycle rules.',
        explain: 'S3 is the cheapest durable place for active logs, and lifecycle rules can move objects to colder classes automatically.'
      },
      {
        text: 'Archive after 30 days at the lowest cost',
        anyOf: [['glacier']],
        hint: 'Rarely read and a 48-hour wait is fine. Go as cold as possible.',
        explain: 'A lifecycle rule to S3 Glacier Deep Archive gives the lowest storage price. Standard retrieval is within 12 hours and bulk within 48.'
      },
      {
        text: 'Outbound-only internet for private instances',
        anyOf: [['natgw']],
        hint: 'Instances should be able to start connections out, but nothing should be able to come in.',
        explain: 'A NAT gateway in a public subnet lets private instances start outbound connections and blocks unsolicited inbound ones. For HA, use one per AZ.'
      }
    ],
    traps: [
      { service: 'ebs', text: 'EBS costs more per GB and attaches to a single instance. It is wrong for a 7-year archive.' },
      { service: 'efs', text: 'EFS is a shared file system with much higher per-GB cost than S3 or Glacier.' },
      { service: 'vpn', text: 'VPN links to your own network. It does not reach public patch repositories.' },
      { service: 'directconnect', text: 'A dedicated line to on-premises is costly and irrelevant to internet patches.' },
      { service: 'redshift', text: 'Paying for a data warehouse cluster to hold cold logs is waste.' }
    ],
    lesson: 'Rarely-accessed long-term data → S3 lifecycle to Glacier Deep Archive; private-subnet outbound → NAT gateway.'
  }
];

export const QUIZ = [
  {
    q: 'An order event must reach three independent services, each processing at its own pace without losing messages. Which design has the LEAST operational overhead?',
    options: ['Kinesis Data Streams with three consumer apps on EC2', 'SNS topic fanning out to three SQS queues', 'One SQS queue polled by all three services', 'Write events to DynamoDB and have each service scan the table'],
    answer: 1,
    explain: 'SNS→SQS fan-out gives each service its own durable queue. With one shared SQS queue, each message goes to only one consumer, so services would steal each other\'s messages.',
    domain: 'Resilient', service: 'sns'
  },
  {
    q: 'A site streams clickstream events from 100,000 users. Several analytics apps must read the same records in order and be able to replay the last 24 hours. Which service fits?',
    options: ['SQS standard queue', 'SNS topic', 'Kinesis Data Streams', 'SQS FIFO queue'],
    answer: 2,
    explain: 'Kinesis keeps records (24 h by default, extendable), orders them per shard and lets many consumers read and replay. With SQS, messages are deleted once consumed.',
    domain: 'High-Performing', service: 'kinesis'
  },
  {
    q: 'A TCP-based trading app needs millions of requests per second, ultra-low latency and a static IP address per AZ. Which load balancer should be used?',
    options: ['Application Load Balancer', 'Classic Load Balancer', 'API Gateway', 'Network Load Balancer'],
    answer: 3,
    explain: 'NLB works at layer 4, handles millions of requests/s with very low latency and supports an Elastic IP per AZ. ALB is layer 7 and has no static IPs.',
    domain: 'High-Performing', service: 'nlb'
  },
  {
    q: 'Requests to /api/* must go to one group of containers and /images/* to another, behind a single HTTPS endpoint. What should a solutions architect use?',
    options: ['Application Load Balancer with path-based routing rules', 'Network Load Balancer with one listener per path', 'Route 53 weighted routing', 'Global Accelerator with endpoint weights'],
    answer: 0,
    explain: 'ALB listener rules route on URL path and host to different target groups. NLB is layer 4 and cannot see URL paths.',
    domain: 'High-Performing', service: 'alb'
  },
  {
    q: 'An RDS MySQL database must fail over automatically with no application change if its Availability Zone fails. What should be done?',
    options: ['Enable a Multi-AZ deployment', 'Create a read replica in another AZ', 'Take hourly automated snapshots', 'Create a cross-Region read replica'],
    answer: 0,
    explain: 'Multi-AZ keeps a synchronous standby and fails over automatically behind the same endpoint. Read replicas are asynchronous and must be promoted manually.',
    domain: 'Resilient', service: 'rdsmultiaz'
  },
  {
    q: 'Nightly reporting queries slow down a production RDS PostgreSQL database. Which change offloads them with the LEAST impact on the primary?',
    options: ['Enable Multi-AZ and point reports at the standby', 'Double the primary instance size', 'Create a read replica and point reports at it', 'Migrate the database to DynamoDB'],
    answer: 2,
    explain: 'A read replica serves read-only queries separately from the primary. A Multi-AZ instance standby cannot serve read traffic.',
    domain: 'High-Performing', service: 'readreplica'
  },
  {
    q: 'A multiplayer game uses UDP. Players worldwide need lower latency, two static anycast IPs and fast failover between Regions. Which service fits?',
    options: ['Amazon CloudFront', 'AWS Global Accelerator', 'Route 53 latency-based routing', 'S3 Transfer Acceleration'],
    answer: 1,
    explain: 'Global Accelerator carries TCP/UDP over the AWS backbone through static anycast IPs and fails over in seconds. CloudFront is an HTTP(S) content cache.',
    domain: 'High-Performing', service: 'globalaccelerator'
  },
  {
    q: 'Users worldwide download images and videos from an S3 bucket in one Region and see slow loads. What is the MOST cost-effective improvement?',
    options: ['Replicate the bucket to five Regions with CRR', 'Enable S3 Transfer Acceleration', 'Move the files to EBS on larger EC2 instances', 'Put a CloudFront distribution in front of the bucket'],
    answer: 3,
    explain: 'CloudFront caches at edge locations, cutting latency and S3 egress. Transfer Acceleration speeds up transfers but caches nothing, and is mainly used for long-distance uploads.',
    domain: 'Cost-Optimized', service: 'cloudfront'
  },
  {
    q: 'Dozens of Linux EC2 instances across three AZs need a shared POSIX file system that grows automatically. Which storage should be used?',
    options: ['Amazon EFS', 'EBS io2 with Multi-Attach', 'Amazon S3', 'EC2 instance store'],
    answer: 0,
    explain: 'EFS is a managed NFS file system that many instances across AZs can mount, and it grows automatically. EBS Multi-Attach works only within a single AZ.',
    domain: 'Resilient', service: 'efs'
  },
  {
    q: 'A self-managed database on EC2 needs block storage with a sustained 50,000 IOPS at low latency. Which option meets this?',
    options: ['EFS General Purpose', 'S3 Standard', 'EBS Throughput Optimized HDD (st1)', 'EBS Provisioned IOPS SSD (io2)'],
    answer: 3,
    explain: 'io2 is designed for sustained high-IOPS, I/O-intensive databases. st1 is HDD built for sequential throughput, not random IOPS.',
    domain: 'High-Performing', service: 'ebs'
  },
  {
    q: 'Objects have unpredictable access patterns that change over time. The company wants automatic cost savings, millisecond access and no retrieval fees. Which storage class?',
    options: ['S3 Standard-IA', 'S3 One Zone-IA', 'S3 Intelligent-Tiering', 'S3 Glacier Flexible Retrieval'],
    answer: 2,
    explain: 'Intelligent-Tiering moves objects between tiers based on access, with no retrieval fees. Standard-IA charges per GB retrieved, which hurts when access is unpredictable.',
    domain: 'Cost-Optimized', service: 's3'
  },
  {
    q: 'Compliance archives must be kept for 10 years, will likely never be read, and retrieval within 48 hours is acceptable. Which is the MOST cost-effective option?',
    options: ['S3 Glacier Deep Archive', 'S3 Standard-IA', 'S3 Glacier Instant Retrieval', 'S3 One Zone-IA'],
    answer: 0,
    explain: 'Deep Archive is the cheapest S3 storage class, with retrieval in 12-48 hours. Glacier Instant Retrieval costs more because it offers millisecond access.',
    domain: 'Cost-Optimized', service: 'glacier'
  },
  {
    q: 'Image thumbnails can be regenerated from originals, are rarely accessed, and must load in milliseconds. What is the MOST cost-effective storage class?',
    options: ['S3 Standard', 'S3 Glacier Deep Archive', 'S3 Standard-IA', 'S3 One Zone-IA'],
    answer: 3,
    explain: 'One Zone-IA is cheaper than Standard-IA and fine for data that can be recreated if an AZ is lost. Deep Archive takes hours to retrieve.',
    domain: 'Cost-Optimized', service: 's3'
  },
  {
    q: 'A security team must explicitly DENY traffic from a malicious IP range to every instance in a subnet. What should be used?',
    options: ['A deny rule in the instances\' security group', 'A deny rule in the subnet\'s network ACL', 'An IAM policy with an aws:SourceIp deny', 'A blackhole route in the route table'],
    answer: 1,
    explain: 'Network ACLs work at subnet level and support explicit deny rules. Security groups only have allow rules.',
    domain: 'Secure', service: 'ec2'
  },
  {
    q: 'A security group and a custom network ACL both allow inbound TCP 443, but clients never get responses. What is the MOST likely fix?',
    options: ['Add an outbound 443 rule to the security group', 'Attach an IAM role to the instance', 'Allow outbound ephemeral ports 1024-65535 in the NACL', 'Add a NAT gateway to the subnet'],
    answer: 2,
    explain: 'NACLs are stateless, so return traffic to clients\' ephemeral ports must be allowed explicitly. Security groups are stateful and allow responses automatically.',
    domain: 'Secure', service: 'ec2'
  },
  {
    q: 'An application on EC2 needs to read objects from an S3 bucket. What is the MOST secure way to grant access?',
    options: ['Attach an IAM role to the instance via an instance profile', 'Create an IAM user and store its access keys in a config file', 'Bake an IAM user\'s access keys into the AMI', 'Make the bucket public and restrict by IP'],
    answer: 0,
    explain: 'An instance role supplies temporary credentials that rotate automatically. Long-term access keys on disk can leak and do not rotate.',
    domain: 'Secure', service: 'iam'
  },
  {
    q: 'Developers in Account A need temporary access to resources in Account B. Which approach follows best practice?',
    options: ['Create duplicate IAM users in Account B', 'Share Account B root credentials', 'Make Account B resources public', 'Create a role in Account B that trusts Account A and have developers assume it'],
    answer: 3,
    explain: 'A cross-account role assumed through STS gives temporary, auditable credentials. Duplicate IAM users mean more long-term credentials to manage.',
    domain: 'Secure', service: 'iam'
  },
  {
    q: 'Instances in private subnets must download patches from the internet but must not accept inbound connections. Which option is highly available with the LEAST operational overhead?',
    options: ['A NAT instance on EC2 in a public subnet', 'Route the private subnets to an internet gateway', 'Assign Elastic IPs to the instances', 'A NAT gateway in a public subnet in each AZ'],
    answer: 3,
    explain: 'NAT gateway is managed and allows outbound-only connections, and one per AZ removes cross-AZ dependency. A NAT instance has to be patched and made highly available by you.',
    domain: 'Resilient', service: 'natgw'
  },
  {
    q: 'S3 data must be encrypted at rest with keys whose policies the company controls, usage audited in CloudTrail and rotation automatic. Which option has the LEAST overhead?',
    options: ['SSE-S3', 'SSE-KMS with a customer managed key', 'Client-side encryption with self-managed keys', 'SSE-C with customer-provided keys'],
    answer: 1,
    explain: 'With SSE-KMS and a customer managed key, you control the key policy, CloudTrail logs every key use and rotation is automatic. With SSE-S3, S3 manages the keys and you get no key policy.',
    domain: 'Secure', service: 'kms'
  },
  {
    q: 'RDS database credentials must rotate automatically every 30 days with the LEAST operational overhead. What should be used?',
    options: ['Secrets Manager with automatic rotation', 'Parameter Store SecureString plus a cron script', 'An encrypted file in S3 updated manually', 'Lambda environment variables'],
    answer: 0,
    explain: 'Secrets Manager has built-in scheduled rotation for RDS. Parameter Store has no native rotation, so you would have to build it yourself.',
    domain: 'Secure', service: 'secretsmanager'
  },
  {
    q: 'An S3 bucket was deleted last week. The security team must find which IAM identity deleted it. Which service provides this?',
    options: ['CloudWatch metrics', 'VPC Flow Logs', 'AWS CloudTrail', 'CloudWatch dashboards'],
    answer: 2,
    explain: 'CloudTrail records management API calls such as DeleteBucket, including who made them. Event history keeps them for 90 days. CloudWatch is for metrics and logs, not API identity.',
    domain: 'Secure', service: 'cloudtrail'
  },
  {
    q: 'An Auto Scaling group must add instances when average CPU exceeds 70%, and the ops team wants an email alert. What should be configured?',
    options: ['CloudTrail with an SNS notification', 'A CloudWatch alarm on CPUUtilization driving a scaling policy and an SNS topic', 'An AWS Config rule on instance type', 'A scheduled scaling action every hour'],
    answer: 1,
    explain: 'CloudWatch alarms watch metrics and can trigger scaling policies and SNS emails. CloudTrail logs API calls and does not watch CPU.',
    domain: 'Resilient', service: 'cloudwatch'
  },
  {
    q: 'A gaming leaderboard needs a key-value store with single-digit millisecond latency at millions of requests per second and no servers to manage. Which database fits?',
    options: ['RDS MySQL with read replicas', 'Amazon Redshift', 'Aurora with Multi-AZ', 'DynamoDB'],
    answer: 3,
    explain: 'DynamoDB is serverless NoSQL with single-digit millisecond performance at any scale. RDS and Aurora are relational and instance-based.',
    domain: 'High-Performing', service: 'dynamodb'
  },
  {
    q: 'A team needs a MySQL-compatible database that keeps six copies of data across three AZs and supports up to 15 low-lag read replicas. Which service fits?',
    options: ['RDS MySQL Multi-AZ', 'DynamoDB global tables', 'Amazon Aurora MySQL', 'Amazon Redshift'],
    answer: 2,
    explain: 'Aurora keeps 6 copies across 3 AZs and supports up to 15 Aurora Replicas. RDS MySQL is MySQL-compatible but lacks Aurora\'s shared storage and fast replicas.',
    domain: 'Resilient', service: 'aurora'
  },
  {
    q: 'An app runs in two Regions. Users should reach the Region that gives them the lowest latency, and an unhealthy Region should be avoided. Which Route 53 policy?',
    options: ['Simple', 'Weighted', 'Latency-based with health checks', 'Geolocation'],
    answer: 2,
    explain: 'Latency routing sends users to the lowest-latency Region, and health checks remove unhealthy endpoints. Geolocation routes by user location, not measured latency.',
    domain: 'High-Performing', service: 'route53'
  },
  {
    q: 'For active-passive disaster recovery, users should be sent to a static S3 site only when the primary site fails health checks. Which Route 53 policy?',
    options: ['Failover routing with a health check', 'Multivalue answer routing', 'Geoproximity routing', 'Weighted routing 50/50'],
    answer: 0,
    explain: 'Failover routing answers with the secondary record only when the primary is unhealthy. A 50/50 weighted split sends half of all traffic to the backup all the time.',
    domain: 'Resilient', service: 'route53'
  },
  {
    q: 'For legal reasons, users in Germany must be served content from a different endpoint than everyone else. Which Route 53 policy?',
    options: ['Latency-based', 'Weighted', 'Simple', 'Geolocation'],
    answer: 3,
    explain: 'Geolocation routing picks a record based on the user\'s country or continent. Latency routing can send a German user anywhere that happens to be faster.',
    domain: 'High-Performing', service: 'route53'
  },
  {
    q: 'A nightly batch job runs for about 40 minutes. The team wants no servers to manage. Which is the BEST solution?',
    options: ['Lambda with the maximum timeout', 'An ECS Fargate task run on a schedule by EventBridge', 'Lambda with more memory to finish sooner', 'API Gateway calling the job synchronously'],
    answer: 1,
    explain: 'Fargate runs containers with no servers and no time limit. Lambda stops at 15 minutes, so a 40-minute job will not fit.',
    domain: 'High-Performing', service: 'lambda'
  },
  {
    q: 'A fault-tolerant, stateless batch workload can be interrupted and restarted at any time. Which EC2 purchasing option is MOST cost-effective?',
    options: ['On-Demand Instances', 'Reserved Instances', 'Spot Instances', 'Dedicated Hosts'],
    answer: 2,
    explain: 'Spot offers discounts of up to 90% for interruptible work. Reserved Instances need a 1- or 3-year commitment and suit steady workloads.',
    domain: 'Cost-Optimized', service: 'ec2'
  },
  {
    q: 'A steady 24/7 workload will run for 3 years, but the team expects to change instance families and move parts to Fargate and Lambda. What is MOST cost-effective?',
    options: ['Standard Reserved Instances', 'Compute Savings Plans', 'Spot Instances', 'On-Demand Capacity Reservations'],
    answer: 1,
    explain: 'Compute Savings Plans apply across EC2 families and Regions, Fargate and Lambda. Standard RIs are tied to an instance family and cover only EC2.',
    domain: 'Cost-Optimized', service: 'ec2'
  },
  {
    q: 'Only the web servers may reach an RDS database on port 3306. The web tier auto scales, so its IPs keep changing. What should be configured?',
    options: ['DB security group inbound rule allowing 3306 from the web tier security group', 'Network ACL on the DB subnet allowing 3306 from 0.0.0.0/0', 'An IAM policy attached to the web servers\' role', 'A route table entry from the web subnet to the DB subnet'],
    answer: 0,
    explain: 'A security group can use another security group as its source, so new instances are covered automatically. NACLs only match CIDR ranges and are stateless.',
    domain: 'Secure', service: 'securitygroup'
  },
  {
    q: 'Private-subnet instances send several TB per month to S3 through a NAT gateway, and NAT data processing charges are high. What is the MOST cost-effective fix?',
    options: ['Create an S3 interface VPC endpoint', 'Create an S3 gateway VPC endpoint', 'Replace the NAT gateway with a NAT instance', 'Order a Direct Connect connection'],
    answer: 1,
    explain: 'Gateway endpoints (S3 and DynamoDB only) cost nothing and keep traffic on the AWS network. Interface endpoints also work but charge per hour and per GB.',
    domain: 'Cost-Optimized', service: 'vpcendpoint'
  },
  {
    q: 'A team runs its apps on Kubernetes with Helm charts and wants to move to AWS with a managed control plane and no worker nodes to manage. Which option fits?',
    options: ['Amazon EKS with AWS Fargate', 'Amazon ECS on EC2', 'AWS Elastic Beanstalk', 'Amazon ECS on Fargate'],
    answer: 0,
    explain: 'EKS runs upstream Kubernetes, so existing manifests and Helm charts work, and Fargate removes the nodes. ECS is AWS-native and does not run Kubernetes manifests.',
    domain: 'High-Performing', service: 'eks'
  },
  {
    q: 'Analysts run a few ad-hoc SQL queries per month on Parquet logs in S3. They want no infrastructure and to pay only for what they query. Which service?',
    options: ['Amazon Redshift provisioned cluster', 'Amazon EMR cluster running Hive', 'Amazon Athena', 'Amazon RDS for PostgreSQL'],
    answer: 2,
    explain: 'Athena is serverless SQL directly on S3, billed per data scanned. A provisioned Redshift cluster bills even when idle and suits frequent, heavy BI.',
    domain: 'Cost-Optimized', service: 'athena'
  },
  {
    q: 'A company must move 200 TB to S3 within 3 weeks. Its 1 Gbps internet link is shared and already 50% used. Which option is BEST?',
    options: ['AWS DataSync over the internet', 'AWS Snowball Edge devices', 'AWS DMS full load', 'S3 Transfer Acceleration'],
    answer: 1,
    explain: 'At about 500 Mbps, 200 TB takes over a month online, so you ship it on Snowball. DataSync is good for online transfers but is still capped by the link, and DMS is for databases.',
    domain: 'High-Performing', service: 'snowball'
  },
  {
    q: 'A Windows .NET application needs shared file storage over SMB with Active Directory integration and NTFS permissions. Which service?',
    options: ['Amazon FSx for Windows File Server', 'Amazon EFS', 'Amazon S3', 'EBS Multi-Attach volumes'],
    answer: 0,
    explain: 'FSx for Windows File Server provides native SMB, AD integration and NTFS ACLs. EFS is NFS for Linux and is not supported on Windows instances.',
    domain: 'High-Performing', service: 'fsx'
  },
  {
    q: 'A company must automatically discover and classify PII, such as credit card numbers, stored across its S3 buckets. Which service?',
    options: ['Amazon GuardDuty', 'Amazon Inspector', 'Amazon Macie', 'AWS Config'],
    answer: 2,
    explain: 'Macie finds sensitive data in S3. GuardDuty detects threats from CloudTrail, VPC Flow Logs and DNS logs. Inspector scans workloads for software vulnerabilities.',
    domain: 'Secure', service: 'macie'
  },
  {
    q: 'Auditors want a timeline of how each security group\'s rules changed, plus automatic flagging of any group that allows SSH from 0.0.0.0/0. Which service fits BEST?',
    options: ['AWS CloudTrail', 'Amazon Inspector', 'AWS Trusted Advisor', 'AWS Config with a managed rule'],
    answer: 3,
    explain: 'Config records each resource\'s configuration history and evaluates rules such as restricted-ssh. CloudTrail shows who made each API call, not the resource\'s state over time.',
    domain: 'Secure', service: 'config'
  },
  {
    q: 'No account in the Sandbox OU, including its administrators, may create resources outside eu-west-1. What should be used?',
    options: ['A service control policy attached to the OU', 'IAM policies in each account', 'An AWS Config rule that flags other Regions', 'IAM permissions boundaries on each user'],
    answer: 0,
    explain: 'SCPs cap the maximum permissions of every principal in member accounts, so local admins cannot bypass them. A Config rule only detects a violation after it happens.',
    domain: 'Secure', service: 'organizations'
  },
  {
    q: 'An order process has 6 steps with branching, per-step retries with backoff, a compensating refund on failure, and visual execution history. Which has the LEAST operational overhead?',
    options: ['A chain of SQS queues between Lambda functions', 'An AWS Step Functions state machine', 'SNS topics between each step', 'One Lambda function that calls the others'],
    answer: 1,
    explain: 'Step Functions manages state, Retry/Catch, branching and execution history declaratively. An SQS chain decouples the steps, but you must hand-code state tracking and compensation.',
    domain: 'Resilient', service: 'stepfunctions'
  },
  {
    q: 'A company must connect 30 VPCs and two on-premises sites with transitive routing and central management. Which solution is SIMPLEST?',
    options: ['Full-mesh VPC peering', 'A Site-to-Site VPN from every VPC', 'AWS Global Accelerator', 'AWS Transit Gateway'],
    answer: 3,
    explain: 'Transit Gateway is a regional hub that routes transitively between VPCs, VPNs and Direct Connect. VPC peering is not transitive, so a full mesh of 30 VPCs needs 435 connections.',
    domain: 'Resilient', service: 'transitgateway'
  },
  {
    q: 'Application logs must be delivered to S3 and OpenSearch in near real time, with no consumer code to write or scale. Which service?',
    options: ['Kinesis Data Streams with custom consumers', 'Amazon SQS', 'Amazon Data Firehose', 'Amazon SNS'],
    answer: 2,
    explain: 'Firehose is fully managed: it buffers, can transform, and loads data into S3, Redshift, OpenSearch and more. Data Streams needs consumers you build, in exchange for real-time reads and replay.',
    domain: 'High-Performing', service: 'firehose'
  },
  {
    q: 'On-premises apps must keep using NFS/SMB shares while files are stored durably in S3, with a local cache for recently used data. Which service?',
    options: ['AWS DataSync', 'AWS Snowball Edge', 'Amazon EFS', 'Amazon S3 File Gateway (Storage Gateway)'],
    answer: 3,
    explain: 'S3 File Gateway presents NFS/SMB shares on premises, caches hot data locally and stores files as S3 objects. DataSync moves data but does not provide an ongoing file share.',
    domain: 'Resilient', service: 'storagegateway'
  },
  {
    q: 'A public Application Load Balancer needs an HTTPS certificate that is free and renews automatically. What should be used?',
    options: ['An AWS Certificate Manager public certificate', 'A self-signed certificate uploaded to IAM', 'A third-party certificate imported into ACM', 'An AWS KMS customer managed key'],
    answer: 0,
    explain: 'ACM public certificates are free for integrated services such as ELB and CloudFront and renew automatically. ACM does not renew certificates you import.',
    domain: 'Secure', service: 'acm'
  },
  {
    q: 'Admins need shell access to EC2 instances in private subnets with no bastion host, no inbound port 22, and every session logged. What should be used?',
    options: ['A bastion host in a public subnet', 'AWS Systems Manager Session Manager', 'EC2 key pairs with SSH limited by security group', 'A Site-to-Site VPN'],
    answer: 1,
    explain: 'Session Manager works through the SSM Agent and an IAM role, needs no inbound ports, and can log sessions to S3 or CloudWatch Logs. A bastion still exposes SSH and must be patched.',
    domain: 'Secure', service: 'ssm'
  }
];
