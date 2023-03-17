This express app serves as an inventory to keep track of different loans and investments done by a family office. For every investment or loan made, a debtor has to give a warranty which can be put in any of three different buckets: company shares, vehicles, and real state assets. Models, using mongoose, were created to store any kind of data point related to the business operations. These models are: 

- warranty (i.e. asset provided by the borrower as a collateral if the borrower defaults on the loan) 
- country (i.e. country where the loan or investment was made)
- category (i.e. category of warranty given by the borrower)
- business (i.e. investment or loan made. This contains the borrower's personal information and the amount invested)
- user (i.e. each user that has access to the app. Users access has to be approved by the admin user for them to have access to each of the endpoints in the app)

All data is stored in MongoDB. Each instance of any model, except for the user model, can be edited, deleted, or created by any user once permission or access is granted by the admin user. The file "Family Inventory Express App.mov" is a 2 min demo of the app's functionalities. Download it if you wish to see what the app can do. 
