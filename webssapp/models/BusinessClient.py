from bson import ObjectId


class BusinessClient:

    def __init__(self, name):
        self.name = name
        self._id = None
        self.active = False
        self.locations = {}

    # activate client
    def activate(self):
        self.active = True

    # deactivate client
    def deactivate(self):
        self.active = False

    # load from db
    def load_from_db(self, db_conn, client_name):
        db_dict = dict(db_conn.business_clients.find_one({'name': client_name}))
        self.name = db_dict['name']
        self._id = str(db_dict['_id'])
        self.active = db_dict['active']
        self.locations = [BusinessLocation().from_dict(loc) for loc in db_dict['locations']]

    # save to db
    def save_new_client(self, db_conn):
        # catch if schedule already exists; suggest update_db
        client_dict = {
            'name': self.name,
            'active': self.active,
            'locations': [loc.to_dict() for loc in self.locations]
        }
        db_conn.business_clients.insert(client_dict)

    def update_db(self, db_conn, client_id):
        # catch if schedule does not exist; suggest save_new_client
        db_conn.business_clients.update_one({'_id': ObjectId(client_id)},
                                            {'$set': {
                                               'name': self.name,
                                               'active': self.active,
                                               'locations': [loc.to_dict() for loc in self.locations]
                                            }})

    def add_location(self, loc):
        self.locations[loc.name] = loc


class BusinessLocation:

    def __init__(self, name=None):
        self.name = name
        self.accounts = {'owners': [], 'admins': [], 'employees': []}
        self.schedules = []

    # add emp to location
    def add_account(self, user_name, level):
        # catch accounts which already exist at this location
        # catch user
        if level == 'owner':
            self.accounts['owners'].append(user_name)
        elif level == 'admin':
            self.accounts['admins'].append(user_name)
        elif level == 'employee':
            self.accounts['employees'].append(user_name)
        else:
            print("The provided level argument does not exist.")

    # rm emp from location
    def remove_account(self, user_name):
        for key in self.accounts.keys():
            self.accounts[key][:] = [user for user in self.accounts[key] if user != user_name]

    # add schedule to location
    def add_schedule(self, schedule_id):
        # catch if schedule is already in list
        self.schedules.append(schedule_id)

    # rm schedule from location
    def remove_schedule(self, schedule_id):
        # warn if schedule is not in list
        self.schedules.remove(schedule_id)

    def to_dict(self):
        return vars(self)

    def from_dict(self, db_dict):
        self.name = db_dict['name']
        self.accounts = db_dict['accounts']
        self.schedules = db_dict['schedules']
