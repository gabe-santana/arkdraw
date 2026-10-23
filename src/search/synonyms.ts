/**
 * Well-known terms, acronyms and cross-cloud equivalents.
 *
 * Each group is a set of interchangeable phrases: searching for any of them
 * also finds items described by the others ("vnet" finds Azure "Virtual
 * Networks", "vm" finds EC2 / Compute Engine / Virtual Machines, "k8s" finds
 * EKS/AKS/GKE…). Phrases are lowercase; multi-word phrases match as a whole.
 */
export const SYNONYM_GROUPS: string[][] = [
  // --- Vendors ------------------------------------------------------------------
  ['aws', 'amazon', 'amazon web services'],
  ['gcp', 'google', 'google cloud', 'google cloud platform'],
  ['azure', 'microsoft azure', 'microsoft'],
  ['oci', 'oracle', 'oracle cloud'],
  ['alibaba', 'aliyun', 'alibaba cloud'],

  // --- Networking ---------------------------------------------------------------
  ['vnet', 'virtual network', 'vpc', 'virtual private cloud', 'vcn', 'virtual cloud network', 'network'],
  ['subnet', 'subnetwork', 'sub network'],
  ['lb', 'load balancer', 'elb', 'alb', 'nlb', 'application load balancer', 'network load balancer', 'elastic load balancing', 'load balancing', 'application gateway', 'front door', 'cloud load balancing'],
  ['dns', 'domain name system', 'route 53', 'route53', 'cloud dns', 'dns zone', 'dns zones'],
  ['cdn', 'content delivery network', 'cloudfront', 'cloud cdn', 'front door', 'edge'],
  ['waf', 'web application firewall', 'firewall', 'fw', 'cloud armor', 'shield', 'network security group', 'nsg', 'security group'],
  ['vpn', 'virtual private network', 'vpn gateway', 'client vpn', 'site to site'],
  ['nat', 'nat gateway', 'network address translation'],
  ['igw', 'internet gateway', 'gateway'],
  ['peering', 'vnet peering', 'vpc peering', 'transit gateway', 'tgw', 'virtual wan'],
  ['apigw', 'api gateway', 'api management', 'apim', 'apigee', 'endpoints', 'api'],
  ['private link', 'privatelink', 'private endpoint', 'private service connect'],
  ['express route', 'expressroute', 'direct connect', 'interconnect', 'fastconnect'],
  ['ip', 'public ip', 'elastic ip', 'eip', 'ip address'],
  ['router', 'routing', 'route table', 'cloud router'],
  ['switch', 'network switch', 'l2'],
  ['wifi', 'wi-fi', 'wireless', 'access point', 'ap'],
  ['internet', 'www', 'web', 'globe', 'public internet'],

  // --- Compute ------------------------------------------------------------------
  ['vm', 'virtual machine', 'virtual machines', 'ec2', 'elastic compute cloud', 'instance', 'instances', 'compute engine', 'gce', 'server', 'host', 'compute', 'droplet', 'ecs instance'],
  ['vmss', 'scale set', 'virtual machine scale sets', 'auto scaling', 'autoscaling', 'asg', 'auto scaling group', 'managed instance group', 'mig'],
  ['serverless', 'faas', 'function', 'functions', 'lambda', 'azure functions', 'function app', 'cloud functions', 'cloud run functions', 'oci functions', 'function compute'],
  ['k8s', 'kubernetes', 'kube', 'eks', 'aks', 'gke', 'elastic kubernetes service', 'kubernetes service', 'kubernetes engine', 'container engine for kubernetes', 'oke', 'ack', 'container orchestration', 'cluster'],
  ['container', 'containers', 'docker', 'ecs', 'elastic container service', 'fargate', 'container instances', 'aci', 'cloud run', 'container apps'],
  ['registry', 'container registry', 'ecr', 'elastic container registry', 'acr', 'artifact registry', 'gcr'],
  ['pod', 'pods', 'deployment', 'replicaset', 'statefulset', 'daemonset'],
  ['batch', 'batch processing', 'aws batch', 'azure batch', 'jobs'],
  ['app service', 'web app', 'web apps', 'elastic beanstalk', 'app engine', 'paas'],
  ['bare metal', 'dedicated host', 'physical server'],
  ['gpu', 'accelerator', 'tpu'],
  ['edge', 'iot edge', 'greengrass', 'outposts', 'azure stack', 'anthos'],

  // --- Storage ------------------------------------------------------------------
  ['bucket', 'object storage', 's3', 'simple storage service', 'amazon s3', 'blob', 'blob storage', 'storage account', 'gcs', 'cloud storage', 'oss'],
  ['disk', 'block storage', 'ebs', 'elastic block store', 'managed disk', 'managed disks', 'persistent disk', 'volume', 'volumes', 'hard drive', 'hdd', 'ssd'],
  ['file share', 'file storage', 'efs', 'elastic file system', 'fsx', 'azure files', 'filestore', 'nfs', 'smb', 'nas'],
  ['archive', 'glacier', 'cold storage', 'archive storage', 'backup', 'backups'],
  ['data lake', 'datalake', 'lake formation', 'adls', 'data lake storage'],
  ['storage', 'store', 'repository', 'repo'],

  // --- Databases ----------------------------------------------------------------
  ['db', 'database', 'databases', 'rdbms', 'sql', 'relational database'],
  ['rds', 'relational database service', 'aurora', 'azure sql', 'sql database', 'cloud sql', 'alloydb', 'mysql', 'postgres', 'postgresql', 'mariadb', 'sql server', 'mssql', 'oracle database', 'autonomous database'],
  ['nosql', 'document database', 'dynamodb', 'ddb', 'cosmos', 'cosmos db', 'cosmosdb', 'firestore', 'datastore', 'documentdb', 'mongodb', 'mongo', 'bigtable', 'tablestore'],
  ['cache', 'caching', 'redis', 'memcached', 'elasticache', 'memorystore', 'azure cache', 'in-memory'],
  ['dwh', 'data warehouse', 'warehouse', 'redshift', 'bigquery', 'synapse', 'snowflake', 'maxcompute'],
  ['search', 'elasticsearch', 'opensearch', 'cognitive search', 'ai search', 'solr'],
  ['graph database', 'neptune', 'graph'],
  ['timeseries', 'time series', 'timestream', 'influxdb'],
  ['spanner', 'global database', 'distributed sql'],

  // --- Integration & messaging -------------------------------------------------------
  ['queue', 'message queue', 'mq', 'sqs', 'simple queue service', 'service bus', 'pub/sub', 'pubsub', 'cloud tasks', 'storage queue', 'rabbitmq', 'activemq', 'amazon mq'],
  ['topic', 'pubsub', 'pub sub', 'sns', 'simple notification service', 'notification', 'notifications', 'event grid', 'eventarc'],
  ['stream', 'streaming', 'kinesis', 'event hubs', 'event hub', 'kafka', 'msk', 'dataflow', 'confluent'],
  ['eventbridge', 'event bus', 'events', 'event'],
  ['workflow', 'workflows', 'step functions', 'logic apps', 'orchestration', 'state machine', 'cloud composer', 'airflow'],
  ['etl', 'glue', 'data factory', 'adf', 'dataproc', 'data fusion', 'pipeline', 'pipelines'],
  ['email', 'mail', 'ses', 'simple email service', 'smtp', 'communication services'],

  // --- Security & identity ------------------------------------------------------------
  ['iam', 'identity', 'identity and access management', 'entra', 'entra id', 'azure ad', 'aad', 'active directory', 'cloud identity', 'ram'],
  ['sso', 'single sign on', 'identity center', 'okta'],
  ['auth', 'authentication', 'login', 'sign in', 'cognito', 'b2c', 'identity platform', 'oauth'],
  ['kms', 'key management', 'key management service', 'key vault', 'keyvault', 'cloud kms', 'secrets', 'secret', 'secrets manager', 'secret manager', 'vault', 'hsm'],
  ['cert', 'certificate', 'certificates', 'acm', 'ssl', 'tls'],
  ['siem', 'sentinel', 'security hub', 'security command center', 'guardduty', 'defender'],
  ['ddos', 'ddos protection', 'shield'],
  ['lock', 'locked', 'secure', 'security', 'padlock'],

  // --- Monitoring & DevOps ----------------------------------------------------------------
  ['monitoring', 'monitor', 'cloudwatch', 'azure monitor', 'cloud monitoring', 'observability', 'metrics', 'prometheus', 'grafana'],
  ['logs', 'logging', 'log analytics', 'cloud logging', 'cloudtrail', 'audit'],
  ['apm', 'application insights', 'x-ray', 'xray', 'tracing', 'cloud trace'],
  ['ci/cd', 'cicd', 'ci', 'cd', 'devops', 'codepipeline', 'codebuild', 'pipelines', 'cloud build', 'github actions', 'jenkins'],
  ['iac', 'infrastructure as code', 'cloudformation', 'terraform', 'arm', 'bicep', 'deployment manager', 'resource manager'],
  ['git', 'repo', 'repository', 'codecommit', 'azure repos', 'source repositories', 'github', 'gitlab', 'bitbucket'],

  // --- AI / analytics -----------------------------------------------------------------------
  ['ai', 'ml', 'machine learning', 'artificial intelligence', 'sagemaker', 'azure ml', 'vertex', 'vertex ai', 'bedrock', 'openai', 'cognitive services', 'llm'],
  ['bi', 'business intelligence', 'dashboard', 'dashboards', 'quicksight', 'power bi', 'looker', 'data studio'],
  ['analytics', 'athena', 'emr', 'databricks', 'hdinsight', 'spark', 'hadoop'],
  ['ocr', 'textract', 'document intelligence', 'form recognizer', 'document ai'],
  ['chatbot', 'bot', 'lex', 'bot service', 'dialogflow'],

  // --- Users, devices, generic -------------------------------------------------------------------
  ['user', 'users', 'person', 'people', 'actor', 'customer', 'client', 'human', 'stakeholder'],
  ['pc', 'desktop', 'computer', 'workstation', 'monitor'],
  ['mobile', 'phone', 'smartphone', 'cell', 'android', 'iphone', 'ios', 'tablet'],
  ['laptop', 'notebook'],
  ['browser', 'web browser', 'web app', 'website', 'spa', 'frontend', 'front end'],
  ['backend', 'back end', 'service', 'microservice', 'microservices', 'api server'],
  ['on-prem', 'on prem', 'on-premises', 'datacenter', 'data center', 'corporate data center'],
  ['cloud', 'cloud provider', 'aws cloud'],
  ['region', 'regions', 'availability zone', 'az', 'zone', 'zones'],
  ['iot', 'internet of things', 'iot hub', 'iot core', 'sensor', 'sensors', 'device', 'devices'],
  ['printer', 'print'],

  // --- Diagram vocabulary --------------------------------------------------------------------------
  ['decision', 'diamond', 'rhombus', 'choice', 'condition', 'if', 'gateway'],
  ['start', 'end', 'terminator', 'start / end', 'stop', 'begin', 'pill', 'stadium'],
  ['process', 'task', 'step', 'action', 'activity', 'rectangle', 'box'],
  ['note', 'comment', 'annotation', 'sticky', 'sticky note', 'post-it', 'postit', 'memo'],
  ['container', 'group', 'frame', 'boundary', 'swimlane', 'swim lane', 'pool', 'lane', 'section'],
  ['text', 'label', 'heading', 'title', 'caption', 'typography'],
  ['circle', 'ellipse', 'oval', 'round'],
  ['square', 'rectangle', 'rect', 'box'],
  ['arrow', 'connector', 'line', 'edge', 'link', 'relationship'],
  ['entity', 'table', 'er', 'erd', 'entity relationship'],
  ['class', 'uml class', 'interface', 'object'],
  ['db icon', 'cylinder', 'database', 'datastore', 'data store'],
  ['doc', 'document', 'file', 'paper', 'page'],
  ['org', 'org chart', 'organization chart', 'hierarchy', 'organigram'],
  ['mindmap', 'mind map', 'brainstorm', 'idea'],
  ['kanban', 'board', 'scrum', 'agile', 'backlog'],
  ['gantt', 'timeline', 'roadmap', 'schedule', 'milestone'],
  ['wireframe', 'mockup', 'mock-up', 'prototype', 'ui', 'ux'],
  ['bpmn', 'business process', 'process model'],
  ['c4', 'c4 model', 'architecture', 'software system'],
  ['star', 'favorite', 'rating'],
  ['heart', 'love', 'like'],
  ['cloud shape', 'cloud'],
  ['check', 'checkmark', 'tick', 'done', 'ok'],
  ['warning', 'alert', 'caution', 'danger'],
  ['delete', 'remove', 'trash', 'bin', 'erase'],
  ['copy', 'duplicate', 'clone'],
  ['zoom', 'magnify', 'scale'],
  ['export', 'download', 'save as', 'png', 'svg', 'pdf'],
  ['import', 'open', 'load', 'upload'],
  ['undo', 'revert', 'back'],
  ['settings', 'preferences', 'options', 'configuration', 'config'],
];

/** Common misspellings and spelling variants mapped to a canonical term. */
export const SPELLING: Record<string, string> = {
  kubernets: 'kubernetes',
  kubernates: 'kubernetes',
  kuberentes: 'kubernetes',
  postgress: 'postgres',
  postgre: 'postgres',
  datbase: 'database',
  databse: 'database',
  dabase: 'database',
  firewal: 'firewall',
  laod: 'load',
  balancer: 'balancer',
  balencer: 'balancer',
  serverles: 'serverless',
  lamda: 'lambda',
  lamba: 'lambda',
  cloudfrnt: 'cloudfront',
  dynamo: 'dynamodb',
  cosmo: 'cosmos',
  elastisearch: 'elasticsearch',
  monitering: 'monitoring',
  authentification: 'authentication',
  colour: 'color',
  grey: 'gray',
};
