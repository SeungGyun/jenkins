#pipelise script -> https://www.jenkins.io/doc/book/pipeline/
   

----------
 

##기본 문법


    pipeline {
	    agent any 
	    stages {
	        stage('Build') { 
	            steps {
					script{
					}
	                // 
	            }
	        }
	        stage('Test') { 
	            steps {
	                // 
	            }
	        }
	        stage('Deploy') { 
	            steps {
	                // 
	            }
	        }
	    }
	}

1. `agent { label params.TARGET }` : 실행 되는 머신 이름 (파라 미터로 지정 가능)
2. `parameters {}` : 젠킨스 파라메터 설정 
	1. `string(name:'TARGET', defaultValue: 'TEST')` : 사용 --> params.TARGET
	2. `choice(name: 'TARGET', choices: ['master', 'SAMPLE1', 'SAMPLE2'], description: '')` : 사용 --> params.TARGET
	3. `extendedChoice (
		name: 'servers', 
		type: 'PT_MULTI_SELECT',
		defaultValue: '',
		propertyFile : '파일 위치', 
		propertyKey  : '키정보', 
		defaultPropertyFile  : '파일위치', 
		defaultPropertyKey  : '키정보', 
		multiSelectDelimiter: ',', 
		quoteValue: false, 
		saveJSONParameterToFile: false, 
		visibleItemCount: 3,
		description: '설명',
		) `
3. `triggers {cron('48 10 * * * ')}` : 트리거 설정
4. `environment{KEY = 'INFO'}` :  환경 변수 설정
5. `stages` : 블럭단위
6. `steps` : 프로젝트내 명령 단위 
7. `script` : 스크립트 실행


##스크립트 문법 
1. 날짜
	`def today = new Date()`
	`date = today.format("yyyy-MM-dd")`
2. json 읽기
	`server_json = readJSON file: '/var/test.json'`
3. 파일쓰기
	`writeFile file: "${runFileName}", text: run_ssh`
4. sh 실행 
	`sh "rsync -avzh --progress ./${runFileName} admin@${ip_addr}:./run_script/"`
	
##job 실행
	build job : '../COMMON/200_DATABASE_BACKUP', 
	parameters : [
		string(name:'date', value: "${params.date}"),
		extendedChoice(name: 'servers', value: "${params.servers}"),
		extendedChoice(name: 'db_types', value: "STAT")		
	]

##함수 만들기  > 파이프라인 인자감 참조 않함 
	@NonCPS
	def funtionSample(region){
		databaseInfo = [:]
		databaseInfo['port'] = '1234'		
		databaseInfo['ip'] = '127.0.0.1'
		databaseInfo['user'] = 'test'
		databaseInfo['pass'] = 'test'
		return databaseInfo
	}
