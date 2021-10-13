import groovy.json.JsonSlurperClassic
import java.text.SimpleDateFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Calendar
import java.util.Date


@NonCPS
def isWeekylySnapShot(day){
	def dateFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd")	
	def convertDate = new SimpleDateFormat("yyyy-MM-dd").parse(day)
	if('Sat' != convertDate.format("E")){
		return false
	}
	switch(day){
		case "2021-06-12":
			return true
		case "2021-06-19":
			return true
		case "2021-06-26":
			return true
		case "2021-07-03":
			return true
		case "2021-07-10":
			return true
		case "2021-07-25":
			return true
		case "2021-08-08":
			return true
		case "2021-08-15":
			return true
		default:
			return false
		
	}
	
	return false
	
	
}


def isWeeklyDateConvert(day){
	Calendar cal = Calendar.getInstance();
    def df = new SimpleDateFormat("yyyy-MM-dd");
	def date = df.parse(day);
	cal.setTime(date);
	cal.add(Calendar.DATE, 1);
	
	return df.format(cal.getTime()).replaceAll('-','')
}

def beforDate(day){
	Calendar cal = Calendar.getInstance();
    def df = new SimpleDateFormat("yyyy-MM-dd");
	def date = df.parse(day);
	cal.setTime(date);
	cal.add(Calendar.DATE, -1);
	
	return df.format(cal.getTime())
}


pipeline {
    agent { label params.TARGET }
	
    parameters {
		choice(name: 'TARGET', choices: ['TARGET_0', 'TARGET_1', 'TARGET_2','TARGET_3'], description: '')
		string(name:'date', defaultValue: '')
        extendedChoice (
            name: 'servers', 
            type: 'PT_MULTI_SELECT',
    		defaultValue: '',
    		propertyFile : '/var/common/prop.properties', 
    		propertyKey  : 'test', 
    		defaultPropertyFile  : '/var/common/prop.properties', 
    		defaultPropertyKey  : 'test', 
    		multiSelectDelimiter: ',', 
    		quoteValue: false, 
    		saveJSONParameterToFile: false, 
    		visibleItemCount: 10,
    		description: 'test',
    	)
		extendedChoice (
            name: 'full_target', 
            type: 'PT_MULTI_SELECT',
			propertyFile : '/var/common/prop.properties', 
    		propertyKey  : 'full_target', 
    		defaultPropertyFile  : '/var/common/prop.properties', 
    		defaultPropertyKey  : 'full_target', 
    		multiSelectDelimiter: ',', 
    		quoteValue: false, 
    		saveJSONParameterToFile: false, 
    		visibleItemCount: 14,
    		description: '테이블 리스트',
    	)
    	
    }   
	
    stages {
        stage('Preparing machines') {
			environment {
				BACKUP_IP = '127.0.0.1'
				BACKUP_PATH = '/data01/'
				WEEK_BACKUP_PATH = '/data01/'
				
			}
            steps {
				
                script {
                    def server_json;
                    if(params.TARGET =='master'){
                        server_json = readJSON file: '/var/common/server_info.json'					
                    }else{
                        server_json = readJSON file: '/var/common/server_info.json'					
                    }
					def fileName = env.JOB_NAME.replaceAll('\\/','_')
					int bullNum = env.BUILD_NUMBER.toInteger()
					
					def date =""
					def today = new Date()-1
					if (params.date !=''){
						date = params.date
					}else{
						date = today.format("yyyy-MM-dd")
					}
					
					
					def machines 	= params.servers.split(",")
                    def machinePreparations = [:]
                    for (machine in machines) {
                        projectInfo = machine.split('_')
						def gameCode = projectInfo[0]
						def locale = projectInfo[1]
						def region = projectInfo[2]	
						def ip_addr = projectInfo[3]
						def ip_name = ip_addr.replaceAll('\\.','_')
						def runFileName =  "${fileName}_${bullNum}_${ip_name}.sh"
						def deleteFileName =  "${fileName}_${bullNum - 1}_${ip_name}.sh"
						
						try {
							sh "rm ${deleteFileName}"
						} catch (e) {}
						
						
						def serverInfo = server_json[machine]
						def run_path = serverInfo['run_path']
						println "run_path > $run_path"
						def full_target = params.full_target.split(",")
						def servers = serverInfo['servers']
						def run_ssh ="#!/bin/bash \n"
						run_ssh +='ps ax | grep -E \'mysql|mysqldump_to_csv|DailyBackup|gsutil|FunctionETL|rsync|gzip|DailySnapETLAll|SumServer\' |grep -v mysqld | awk \'{print $1}\' | xargs -r kill -9;\n'
						run_ssh +='sleep 1;\n'
						run_ssh +='ps ax | grep -E \'mysql|mysqldump_to_csv|DailyBackup|gsutil|FunctionETL|rsync|gzip|DailySnapETLAll|SumServer\' |grep -v mysqld | awk \'{print $1}\' | xargs -r kill -9;\n'
						for (server_id in servers){
							db_info = serverInfo[server_id+""]							
							v_database = db_info['db_name']+'_'+isWeeklyDateConvert(date) 
							v_save_path = run_path +'/'+locale+'/'+region+'/'+server_id+'/'+ date
							//run_ssh += "function etlrun${server_id}(){\n"
							run_ssh +="    mkdir -p ${v_save_path};\n"
							//기본 저장 되어있던 파일 가져오기							
							run_ssh +="    rsync -arvzh --progress test@${BACKUP_IP}:${BACKUP_PATH}/${server_id}/${date}/ ${run_path}/${locale}/${region}/${server_id}/${date}/;\n"							
							//토요일이면 주간 데이터 가져오기							
							if(isWeekylySnapShot(date)){ //스토리지에 저장되어있는 파일이 있으면								
								run_ssh +="    # 주간 스토리지 풀백업 데이터 가져오기 \n"
								for (target in full_target) {
									
									run_ssh +="    rsync -arvzh --progress test@${BACKUP_IP}:${WEEK_BACKUP_PATH}/${v_database}/${target}.csv.gz ${v_save_path}/${target}_full.csv.gz;\n"
								}
							}
							run_ssh +="    gzip -d --force ${v_save_path}/*;\n"
							beforDate = beforDate(date)							
							run_ssh +="    mkdir -p ${run_path}/${locale}/${region}/${server_id}/${beforDate};\n"
							for (target in full_target) {									
								run_ssh +="    rsync -arvzh --progress test@${BACKUP_IP}:${BACKUP_PATH}/${server_id}/${beforDate}/${target}_full.csv.gz ${run_path}/${locale}/${region}/${server_id}/${beforDate}/${target}_full.csv.gz;\n"
							}
							run_ssh +="    gzip -d --force ${run_path}/${locale}/${region}/${server_id}/${beforDate}/*;\n"
							
							//run_ssh += '}\n'							
						}
						
						//for (server_id in servers){
						//	run_ssh += "etlrun${server_id} &\n"
						//}
						
						//run_ssh += "wait\n"
						run_ssh += "echo ${runFileName} END \n"
						//스크립트 추가 설정 공통
						
						run_ssh += "pwd \n rm /home/test/run_script/${deleteFileName} 2> /dev/null \n"
						
						println "run_ssh >>> $run_ssh"
						writeFile file: "${runFileName}", text: run_ssh
						//파일 옴기기
						try {
							sh "rsync -avzh --progress ./${runFileName} test@${ip_addr}:./run_script/"
						} catch (e) {}	
                        def agentName =  '../ETL_SERVERS/'+machine
                        def labelParameters = []
                        labelParameters.add([$class: 'StringParameterValue', name: 'run_ssh', value: "sh ./run_script/${runFileName}"])                        
						
                        machinePreparations[agentName] = {
                            stage(agentName ) {
								build job: agentName, parameters: labelParameters                                
                            }
                        }		
						println "--------------------------------------"
					}
				    parallel machinePreparations
                }
            }
        }
    }
}
