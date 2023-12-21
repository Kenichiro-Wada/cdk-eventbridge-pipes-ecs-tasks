import datetime
from dateutil.relativedelta import relativedelta
import boto3
from os import getenv

def Execute():
    print('Run!')
    # コンテナ自体の認証情報確認
    session = boto3.session.Session()
    try:
        sts = session.client('sts')
        work_id_info = sts.get_caller_identity()
        print(work_id_info['Account'])

        message = getenv('MESSAGE')
        print('message:' + message)
        
        s3 = session.client('s3')

        response = s3.list_buckets()
        print(response['Buckets'])

    except Exception as error:
        print(error)

    print('End!')
    now = datetime.datetime.now()
    print(now)

now = datetime.datetime.now()
print(now)

Execute()